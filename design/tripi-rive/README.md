# Tripi Rive

The `Tripi` artboard and state machine use separate layers for breathing, head sway, tail sway, gestures, and expressions. The web footer fires `wave`, `blink`, `laugh`, and `wink` through the `Tripi` view model. The `celebrate` trigger is available for a future booking confirmation.

The legs are separate layers (`leg-left`, `leg-right`) cut along the thigh fold, so Tripi can step. The upper body sits in the `Upper` group, which bobs and leans around the crotch. Set the `walking` boolean on the view model to make Tripi walk in place (the `Walk` layer, last in the state machine). It is `false` by default, so the web mascot keeps standing.

The mobile loading screen uses this walk cycle as an animated WebP, so mobile needs no Rive runtime. Rendering it needs no Rive login, because it only uses the headless capture commands:

```sh
RIVE_BIN=/path/to/rive python tools/mascot/render-tripi-walk.py
```

It writes `apps/mobile/assets/brand/tripi-library/animations/walking.webp`. Re-run it after changing the rig or the `walk` timeline in `tools/mascot/build-tripi-rive.py`.

From the frontend repository, run the following to verify, preview, and export the editable RML project using Rive CLI 1.9.2 or newer.

```sh
rive design/tripi-rive --verify
rive design/tripi-rive
rive design/tripi-rive --publish
```

Export requires a Rive login. Copy `design/tripi-rive/build/tripi.riv` to `apps/web/public/brand/tripi-rive/tripi.riv`. A Free workspace includes the Rive splash screen.

The RML and cropped artwork are ready to use. To regenerate them from the original November mascot pack, run `python tools/mascot/build-tripi-rive.py` with Pillow, NumPy, and SciPy installed. Regeneration replaces the local scene and cropped layers.
