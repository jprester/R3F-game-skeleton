#pragma vscode_glsllint_stage : frag

precision highp float;

varying vec3 vWorldPosition;

uniform vec3 uSunDir;
uniform float uTime;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 17.5);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p); 
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec2(1.3, 0.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldPosition);
  float h = dir.y;

  // Sky gradient: warm peach-pink horizon -> muted lavender mid -> blue-grey top (adjusted to match reference image)
  vec3 skyHorizon = vec3(0.92, 0.68, 0.76);
  vec3 skyMid     = vec3(0.78, 0.66, 0.78);
  vec3 skyTop     = vec3(0.60, 0.62, 0.73);
  vec3 color = mix(skyHorizon, skyMid, smoothstep(0.0, 0.45, h));
  color = mix(color, skyTop, smoothstep(0.25, 0.95, h));

  // === RETRO SUN ===
  vec3 sunDir = normalize(uSunDir);
  float angle = acos(clamp(dot(dir, sunDir), -1.0, 1.0));
  float sunR = 0.18;

  // Pink atmospheric glow — kept tight so it halos the sun without washing the whole sky
  color += vec3(0.95, 0.35, 0.75) * exp(-angle * 7.0) * 0.4;

  if (angle < sunR) {
    // yNorm goes from 0.0 (bottom of sun) to 1.0 (top of sun)
    float yNorm = clamp((dir.y - sunDir.y) / sunR * 0.5 + 0.5, 0.0, 1.0);

    // Neon cyan bottom -> hot core -> magenta top (classic synthwave ramp)
    vec3 cyan    = vec3(0.30, 0.85, 1.0);
    vec3 magenta = vec3(1.0, 0.35, 0.7);
    vec3 sunColor = mix(cyan, magenta, smoothstep(0.0, 1.0, yNorm));

    // Bright near-white band just above the equator where pink meets cyan
    float core = exp(-pow((yNorm - 0.55) * 6.5, 2.0));
    sunColor += vec3(0.4, 0.3, 0.4) * core;

    // Horizontal scan lines confined to the lower (cyan) half; dissolve toward the bottom
    float scanMask = 1.0;
    if (yNorm < 0.5) {
      // Map yNorm in [0.0, 0.5] to t in [0.0, 1.0] from top of stripes (solid) to bottom (thin bars)
      float t = (0.5 - yNorm) / 0.5;
      float wave = sin(yNorm * 90.0);

      // Threshold ranges from -1.0 (at t = 0.0) to +0.95 (at t = 1.0)
      float thresh = -1.0 + 1.95 * pow(t, 1.15);
      scanMask = smoothstep(thresh - 0.06, thresh + 0.06, wave);
    }

    float edge = smoothstep(sunR, sunR * 0.9, angle);
    color = mix(color, sunColor, scanMask * edge);
  }

  // === FBM CLOUDS ===
  if (h > 0.02) {
    vec2 uv = dir.xz / max(h, 0.05);
    vec2 p = uv * 2.2 + vec2(uTime * 0.06, uTime * 0.025);

    // Domain warping for organic, fluffy shapes — warp itself drifts so cloud
    // morphology slowly evolves rather than just translating rigidly.
    vec2 warp = vec2(
      fbm(p + vec2(1.7, 9.2) + uTime * 0.04),
      fbm(p + vec2(8.3, 2.8) - uTime * 0.03)
    );
    float cn = fbm(p + warp * 1.5);

    float cloudShape = smoothstep(0.44, 0.60, cn);
    float hFade = smoothstep(0.02, 0.20, h);            // dissolve at horizon
    float zFade = 1.0 - smoothstep(0.55, 0.85, h);      // thin out near zenith
    float alpha = cloudShape * hFade * zFade * 0.90;

    // Slightly lavender-tinted white
    vec3 cloudCol = mix(vec3(0.88, 0.85, 0.94), vec3(0.98, 0.96, 0.99), h * 2.0);
    color = mix(color, cloudCol, alpha);
  }

  gl_FragColor = vec4(color, 1.0);
}
