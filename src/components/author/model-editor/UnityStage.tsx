import { Unity, UnityProps } from "react-unity-webgl";

type UnityStageProps = {
  unityProvider: UnityProps["unityProvider"];
  isLoaded: boolean;
};

export default function UnityStage({
  unityProvider,
  isLoaded,
}: UnityStageProps) {
  return (
    <main className="flex-1 bg-[#0e1621] relative">
      <div className="absolute inset-0 flex items-center justify-center">
        {!isLoaded && (
          <div className="text-white bg-black/50 px-6 py-3 rounded-lg">
            Đang tải Unity WebGL...
          </div>
        )}
        <Unity
          unityProvider={unityProvider}
          style={{
            width: "100%",
            height: "100%",
            visibility: isLoaded ? "visible" : "hidden",
          }}
        />
      </div>
    </main>
  );
}
