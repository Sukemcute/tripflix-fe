"""Rebuild editable Rive artwork and native timelines from the approved Tripi rig."""
from pathlib import Path
import json
import math
import xml.etree.ElementTree as X
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs/mascot/generated-2026-11-10/tripi-rig'
OUT = ROOT / 'design/tripi-rive'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'assets').mkdir(exist_ok=True)
SIZE = 1254
SCALE = 768 / SIZE
manifest = {}

def load(name):
    return Image.open(SRC / name).convert('RGBA')

def polygon(points):
    m = Image.new('L', (SIZE, SIZE))
    ImageDraw.Draw(m).polygon(points, fill=255)
    return m

def save(name, source, mask):
    im = source.copy()
    a = np.array(im.getchannel('A'), dtype=float)
    im.putalpha(Image.fromarray((a * np.array(mask) / 255).astype('uint8')))
    box = im.getbbox()
    im = im.crop(box)
    dims = (round(im.width*SCALE), round(im.height*SCALE))
    im.resize(dims, Image.Resampling.LANCZOS).save(OUT / 'assets' / (name+'.png'), optimize=True)
    manifest[name] = {'x':box[0]*SCALE, 'y':box[1]*SCALE, 'size':dims}

base = load('rig-base.png')
body = load('rig-body-no-arms.png')
blank = load('rig-face-blank.png')
save('tail', body, polygon([(840,590),(1254,590),(1254,1150),(860,1150)]))
body_area = polygon([(250,650),(835,650),(858,900),(860,1254),(300,1254),(300,900)])

# Chân tách khỏi thân để Tripi bước được. Hai đùi dính nhau tới háng nên cắt theo nếp đùi cong; thân chỉ khoét
# đúng ống chân dưới nếp, còn phần chân nằm khuất sau thân thì hẹp hơn ống chân để nhấc lên không lòi ra ngoài.
CROTCH = (599, 1083)
HIP_LEFT, HIP_RIGHT = (340, 1066), (860, 1068)
LEG_LEFT, LEG_RIGHT = (360, 580), (618, 842)
LEG_HIDDEN = 70

def fold_y(x):
    start, end = (HIP_LEFT, CROTCH) if x <= CROTCH[0] else (HIP_RIGHT, CROTCH)
    t = max(0.0, (x - start[0]) / (end[0] - start[0]))
    return start[1] + (end[1] - start[1]) * t ** 1.6

ys = np.arange(SIZE)[:, None]
xs = np.arange(SIZE)[None, :]
fold = np.array([fold_y(x) for x in range(SIZE)])[None, :]

def tube(span, inset):
    centre, half = (span[0] + span[1]) / 2, (span[1] - span[0]) / 2 - inset
    return np.clip((half - np.abs(xs - centre)) / 3 + 0.5, 0, 1)

def leg_mask(span):
    # Sát nếp đùi giữ đủ bề ngang ống chân: thân nhún lên khi bước, mép mềm của thân vẫn có chân nằm dưới.
    hidden = (ys >= fold - LEG_HIDDEN) & (ys < fold - 30)
    near_fold = (ys >= fold - 30) & (ys < fold)
    return np.maximum.reduce([tube(span, 0) * (ys >= fold), tube(span, 0) * near_fold, tube(span, 8) * hidden])

def as_mask(values):
    return Image.fromarray((np.clip(values, 0, 1) * 255).astype('uint8'))

area = np.array(body_area) / 255
below_fold = np.clip((ys - fold) / 6 + 0.5, 0, 1)
torso = 1 - np.maximum(tube(LEG_LEFT, 5), tube(LEG_RIGHT, 5)) * below_fold
save('body', body, as_mask(area * torso))
save('leg-left', body, as_mask(area * leg_mask(LEG_LEFT)))
save('leg-right', body, as_mask(area * leg_mask(LEG_RIGHT)))
# Bóng nếp đùi đi theo thân, phủ lên đầu chân để chỗ giáp trông như nếp lông.
shade = Image.new('RGBA', (SIZE, SIZE), (120, 50, 10, 255))
shade.putalpha(body.getchannel('A'))
in_legs = np.maximum(tube(LEG_LEFT, 0), tube(LEG_RIGHT, 0))
save('hip-shade', shade, as_mask(area * in_legs * (ys >= fold) * np.exp(-np.clip(ys - fold, 0, None) / 9) * 0.22))
save('head', blank, polygon([(0,0),(1254,0),(1254,665),(0,665)]))

def patch(name, filename, boxes):
    mask = Image.new('L', (SIZE,SIZE))
    draw=ImageDraw.Draw(mask)
    for box in boxes: draw.rectangle(box,fill=255)
    save(name,load(filename),mask.filter(ImageFilter.GaussianBlur(4)))

eyes = [(395,322,572,502),(669,322,839,502)]
for mood,src in [('open','base'),('closed','eyes-closed'),('happy','eyes-happy'),('wink','eyes-wink')]:
    patch('eyes-'+mood, 'rig-'+src+'.png', eyes)
for mood,src in [('smile','base'),('laugh','mouth-laugh'),('grin','mouth-grin')]:
    patch('mouth-'+mood,'rig-'+src+'.png',[(530,493,725,620)])

def arm(name,filename,region):
    image=load(filename)
    delta=np.abs(np.array(image).astype(float)-np.array(body).astype(float)).max(2)>38
    delta &= np.array(region)>0
    delta=ndimage.binary_closing(delta,iterations=4)
    delta=ndimage.binary_fill_holes(delta)
    delta=ndimage.binary_dilation(delta,iterations=2)
    save(name,image,Image.fromarray((delta*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1)))

arm('arm-rest','rig-base.png',polygon([(180,690),(390,690),(390,1000),(180,1000)]))
arm('arm-back','rig-base.png',polygon([(803,690),(990,690),(990,1000),(835,1000)]))
arm('arm-wave','rig-arm-wave-up.png',polygon([(75,470),(250,470),(275,610),(304,655),(390,680),(390,812),(240,808),(75,670)]))

doc=X.Element('Rive',version='1',kind='fragment')
counter=100
def uid():
    global counter
    counter+=1
    return '0:'+str(counter)
def el(parent,tag,**attrs):
    return X.SubElement(parent,tag,{k:str(v) for k,v in attrs.items()})
art=el(doc,'Artboard',id='0:1',name='Tripi',width=768,height=768,defaultStateMachineId='0:2',viewModelId='0:3',viewModelInstanceId='0:4')
groups={}
def node(parent,name,x=0,y=0):
    id=uid();groups[name]=id
    return el(parent,'Node',id=id,name=name,x=x,y=y)
root=node(art,'Root',384,737)
def image(parent,name,pivot=(626,1203),opacity=1):
    m=manifest[name];asset=uid();id=uid();groups[name]=id
    el(doc,'ImageAsset',id=asset,name=name,file='assets/'+name+'.png')
    return el(parent,'Image',id=id,name=name,assetId=asset,originX=0,originY=0,x=m['x']-pivot[0]*SCALE,y=m['y']-pivot[1]*SCALE,opacity=opacity)
image(node(root,'LegLeft'),'leg-left')
image(node(root,'LegRight'),'leg-right')
# Phần thân trên xoay và nhún quanh háng khi bước; Upper đặt ở háng, UpperInner trả gốc toạ độ về như cũ.
crotch=((CROTCH[0]-626)*SCALE,(CROTCH[1]-1203)*SCALE)
upper=node(root,'Upper',*crotch)
upper_inner=node(upper,'UpperInner',-crotch[0],-crotch[1])
tail=node(upper_inner,'Tail',308*SCALE, -260*SCALE)
image(tail,'tail',pivot=(934,943))
image(upper_inner,'arm-back')
torso=node(upper_inner,'Body')
image(torso,'body')
# Bóng nếp đùi chỉ hiện khi bước, để dáng đứng giữ nguyên như trước khi tách chân.
image(torso,'hip-shade',opacity=0)
head=node(upper_inner,'Head',0,-550*SCALE)
image(head,'head',pivot=(626,653))
for name in ['eyes-open','eyes-closed','eyes-happy','eyes-wink','mouth-smile','mouth-laugh','mouth-grin']:
    image(head,name,pivot=(626,653),opacity=1 if name in ['eyes-open','mouth-smile'] else 0)
armgroup=node(upper_inner,'ArmWave',-267*SCALE,-480*SCALE)
arm_rest_pivot=node(armgroup,'Arm lift')
image(arm_rest_pivot,'arm-rest',pivot=(359,723))
image(armgroup,'arm-wave',pivot=(359,723),opacity=0)

vm=el(doc,'ViewModel',id='0:3',name='Tripi',defaultInstanceId='0:4')
inst=el(vm,'ViewModelInstance',id='0:4',name='Default',exports='true')
props={}
for name in ['wave','blink','wink','laugh','celebrate']:
    p=uid();props[name]=p
    el(vm,'ViewModelPropertyTrigger',id=p,name=name)
    el(inst,'ViewModelInstanceTrigger',viewModelPropertyId=p,propertyValue=0)
# Bật walking thì Tripi bước tại chỗ (màn chờ trên mobile); mặc định đứng yên như trước.
props['walking']=uid()
el(vm,'ViewModelPropertyBoolean',id=props['walking'],name='walking')
el(inst,'ViewModelInstanceBoolean',viewModelPropertyId=props['walking'],propertyValue='false')

sm=el(art,'StateMachine',id='0:2',name='Tripi')
anims={}
def animation(name,duration,loop=False):
    id=uid();anims[name]=id
    return el(art,'LinearAnimation',id=id,name=name,fps=60,duration=duration,loopValue='loop' if loop else 'oneShot')
def key(anim,target,prop,values,hold=False):
    ob=el(anim,'KeyedObject',objectId=groups[target]);pr=el(ob,'KeyedProperty',property=prop)
    for frame,value in values:
        k=el(pr,'KeyFrameDouble',frame=frame,value=value,interpolationType='hold' if hold else 'cubic')
        if not hold:el(k,'CubicEaseInterpolator',x1=.42,y1=0,x2=.58,y2=1)

idle=animation('idle',228,True)
key(idle,'Body','scaleY',[(0,1),(110,1.012),(228,1)])
key(idle,'Root','y',[(0,737),(110,734.5),(228,737)])
headidle=animation('headSway',337,True)
key(headidle,'Head','rotation',[(0,-.012),(165,.016),(337,-.012)])
tailidle=animation('tailFollow',293,True)
key(tailidle,'Tail','rotation',[(0,-.025),(130,.045),(293,-.025)])

rest=animation('armRest',1)
for name,val in [('arm-rest',1),('arm-wave',0)]:key(rest,name,'opacity',[(0,val)],True)
key(rest,'ArmWave','rotation',[(0,0)])
key(rest,'Arm lift','rotation',[(0,0)])
wave=animation('wave',122)
key(wave,'arm-rest','opacity',[(0,1),(17,1),(23,0),(96,0),(102,1),(122,1)])
key(wave,'arm-wave','opacity',[(0,0),(17,0),(23,1),(96,1),(102,0),(122,0)])
key(wave,'Arm lift','rotation',[(0,0),(6,-.09),(20,1.43),(98,1.43),(115,-.07),(122,0)])
key(wave,'ArmWave','rotation',[(0,0),(20,.10),(34,-.18),(48,.13),(63,-.15),(78,.09),(99,.06),(122,0)])

def face(name,eye,mouth,length):
    a=animation(name,length)
    for s in ['eyes-open','eyes-closed','eyes-happy','eyes-wink','mouth-smile','mouth-laugh','mouth-grin']:
        key(a,s,'opacity',[(0,1 if s in [eye,mouth] else 0)],True)
    return a
face('neutral','eyes-open','mouth-smile',1)
blink=animation('blink',12)
for s in ['eyes-open','eyes-closed','eyes-happy','eyes-wink','mouth-smile','mouth-laugh','mouth-grin']:
    values=[(0,1 if s in ['eyes-open','mouth-smile'] else 0)]
    if s=='eyes-open':values=[(0,1),(3,0),(8,1)]
    if s=='eyes-closed':values=[(0,0),(3,1),(8,0)]
    key(blink,s,'opacity',values,True)
face('wink','eyes-wink','mouth-grin',58)
laugh=face('laugh','eyes-happy','mouth-laugh',100)
key(laugh,'Head','y',[(0,-550*SCALE),(18,-554*SCALE),(33,-548*SCALE),(49,-554*SCALE),(65,-548*SCALE),(82,-552*SCALE),(100,-550*SCALE)])
celebrate=animation('celebrate',78)
key(celebrate,'Root','scaleY',[(0,1),(10,.96),(21,1.035),(40,.97),(54,1.01),(78,1)])
key(celebrate,'Root','y',[(0,737),(10,740),(27,714),(44,737),(56,733),(78,737)])

# Một chu kỳ hai bước: chân trái nhấc ở nửa đầu, chân phải ở nửa sau; thân nhún mỗi bước và nghiêng về chân trụ.
WALK=64
LIFT=52*SCALE
BOB=14*SCALE
walk=animation('walk',WALK,True)
key(walk,'LegLeft','y',[(0,0),(16,-LIFT),(32,0),(64,0)])
key(walk,'LegRight','y',[(0,0),(32,0),(48,-LIFT),(64,0)])
key(walk,'Upper','y',[(0,crotch[1]),(16,crotch[1]-BOB),(32,crotch[1]),(48,crotch[1]-BOB),(64,crotch[1])])
key(walk,'Upper','rotation',[(0,0),(16,.035),(32,0),(48,-.035),(64,0)])
key(walk,'Head','rotation',[(0,0),(16,-.025),(32,0),(48,.025),(64,0)])
key(walk,'Tail','rotation',[(0,-.02),(16,.07),(32,-.02),(48,.07),(64,-.02)])
key(walk,'ArmWave','rotation',[(0,0),(16,-.07),(32,0),(48,.07),(64,0)])
key(walk,'hip-shade','opacity',[(0,1)],True)

def condition(trig):
    c=X.Element('TransitionViewModelCondition')
    comp=el(c,'TransitionPropertyViewModelComparator');bp=el(comp,'BindablePropertyTrigger')
    el(bp,'DataBindContext',sourcePathIds='0:3-'+props[trig],propertyKey=686)
    el(c,'TransitionValueTriggerComparator',value=0)
    return c
def layer(name,default,actions=None):
    lay=el(sm,'StateMachineLayer',name=name,id=uid())
    state=uid();entry=el(lay,'EntryState',x=0,y=0);el(entry,'StateTransition',stateToId=state)
    el(lay,'ExitState',x=600,y=-160)
    any=el(lay,'AnyState',x=160,y=-160)
    el(lay,'AnimationState',id=state,animationId=anims[default],x=160,y=0)
    for n,(trigger,anim) in enumerate(actions or []):
        sid=uid();tr=el(any,'StateTransition',stateToId=sid,duration=0 if trigger=='blink' else 60,enableEarlyExit='true');tr.append(condition(trigger))
        a=el(lay,'AnimationState',id=sid,animationId=anims[anim],reset='true',x=360+n*180,y=120+n*120)
        el(a,'StateTransition',stateToId=state,duration=100,enableExitTime='true',exitTimeIsPercetange='true',exitTime=100)
layer('Breathing','idle')
layer('Head follow through','headSway')
layer('Tail follow through','tailFollow')
layer('Arm','armRest',[('wave','wave')])
layer('Expression','neutral',[(x,x) for x in ['blink','wink','laugh']])
empty=animation('rest',1)
layer('Celebration','rest',[('celebrate','celebrate')])
def walking_is(value):
    c=X.Element('TransitionViewModelCondition')
    comp=el(c,'TransitionPropertyViewModelComparator');bp=el(comp,'BindablePropertyBoolean')
    el(bp,'DataBindContext',sourcePathIds='0:3-'+props['walking'],propertyKey=634)
    el(c,'TransitionValueBooleanComparator',value='true' if value else 'false')
    return c
# Lớp cuối cùng: lúc bước thì đè lên dáng thở, lắc đầu và tay.
walk_layer=el(sm,'StateMachineLayer',name='Walk',id=uid())
stand_state,walk_state=uid(),uid()
el(el(walk_layer,'EntryState',x=0,y=0),'StateTransition',stateToId=stand_state)
el(walk_layer,'ExitState',x=600,y=-160)
el(walk_layer,'AnyState',x=160,y=-160)
stand=el(walk_layer,'AnimationState',id=stand_state,animationId=anims['rest'],x=160,y=0)
el(stand,'StateTransition',stateToId=walk_state,duration=120).append(walking_is(True))
walking=el(walk_layer,'AnimationState',id=walk_state,animationId=anims['walk'],x=360,y=0)
el(walking,'StateTransition',stateToId=stand_state,duration=120).append(walking_is(False))
for event,trigger in [('enter','wave'),('click','laugh')]:
    listener=el(sm,'StateMachineListenerSingle',targetId=groups['head'],listenerTypeValue=event,name=event)
    change=el(listener,'ListenerViewModelChange');bp=el(change,'BindablePropertyTrigger',propertyValue=1)
    el(bp,'DataBindContext',sourcePathIds='0:3-'+props[trigger],propertyKey=686,direction='true')
# Rive declares front-to-back, unlike the bottom-to-top authoring above.
for parent in [root,upper_inner,torso,head,armgroup]:
    children=list(parent)
    parent[:]=list(reversed(children))
style=uid()
art.set('styleId',style)
el(art,'LayoutComponentStyle',id=style)
X.indent(doc)
X.ElementTree(doc).write(OUT/'scene.rml',encoding='unicode')
(OUT/'rive.yaml').write_text('name: tripi\nmain: Tripi\noutput:\n  dir: build\n',encoding='utf-8')
(OUT/'layers.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(OUT)
