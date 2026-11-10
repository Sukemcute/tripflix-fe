# Tripi Rive

The `Tripi` artboard and state machine use separate layers for breathing, head sway, tail sway, gestures, and expressions. The web footer fires `wave`, `blink`, `laugh`, and `wink` through the `Tripi` view model. The `celebrate` trigger is available for a future booking confirmation.

From the frontend repository, run the following to verify, preview, and export the editable RML project using Rive CLI 1.9.2 or newer.

```sh
rive design/tripi-rive --verify
rive design/tripi-rive
rive design/tripi-rive --publish
```

Export requires a Rive login. Copy `design/tripi-rive/build/tripi.riv` to `apps/web/public/brand/tripi-rive/tripi.riv`. A Free workspace includes the Rive splash screen.

The RML and cropped artwork are ready to use. To regenerate them from the original November mascot pack, run `python tools/mascot/build-tripi-rive.py` with Pillow, NumPy, and SciPy installed. Regeneration replaces the local scene and cropped layers.
