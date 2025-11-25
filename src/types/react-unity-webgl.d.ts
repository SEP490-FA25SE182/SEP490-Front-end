import * as React from "react";

declare module "react-unity-webgl" {
  export interface UnityProps {
    unityProvider?: any;
    style?: React.CSSProperties;
    className?: string;
    tabIndex?: number;
    devicePixelRatio?: number;
  }

  export const Unity: React.FC<UnityProps>;
}
