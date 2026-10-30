// 玩具注册表
import { BubbleWrap } from './bubblewrap.js';
import { Squishy } from './squishy.js';
import { Spinner } from './spinner.js';
import { FidgetCube } from './cube.js';
import { ToggleSwitch } from './switch.js';
import { Zipper } from './zipper.js';
import { Balloon } from './balloon.js';
import { SpringToy } from './spring.js';

export const TOY_CLASSES = {
  bubblewrap: BubbleWrap,
  squishy: Squishy,
  spinner: Spinner,
  cube: FidgetCube,
  switch: ToggleSwitch,
  zipper: Zipper,
  balloon: Balloon,
  spring: SpringToy
};

export function createToy(id) {
  const C = TOY_CLASSES[id];
  return C ? new C() : null;
}
