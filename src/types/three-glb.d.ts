declare module "three/examples/jsm/loaders/GLTFLoader" {
  import * as THREE from "three";

  export class GLTFLoader extends THREE.Loader {
    constructor(manager?: THREE.LoadingManager);
    load(
      url: string,
      onLoad: (gltf: any) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent | unknown) => void
    ): void;
    setPath(path: string): this;
    setResourcePath(path: string): this;
    setCrossOrigin(value: string): this;
  }
}
