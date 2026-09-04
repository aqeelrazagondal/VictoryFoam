type ConnectionNavigator = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

export function canUseWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

export function shouldUseHeavyWebGl() {
  const connection = (navigator as ConnectionNavigator).connection;
  const slowConnection =
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g";
  return canUseWebGl() && !slowConnection;
}
