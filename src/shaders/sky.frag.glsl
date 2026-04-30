#pragma vscode_glsllint_stage : frag

precision highp float;

varying vec3 vWorldPosition;

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

  // Sky gradient: warm peach-pink horizon -> muted lavender mid -> blue-grey top
  vec3 skyHorizon = vec3(0.94, 0.74, 0.80);
  vec3 skyMid     = vec3(0.72, 0.68, 0.88);
  vec3 skyTop     = vec3(0.52, 0.62, 0.82);
  vec3 color = mix(skyHorizon, skyMid, smoothstep(0.0, 0.45, h));
  color = mix(color, skyTop, smoothstep(0.25, 0.95, h));

  // === SUN ===
  vec3 sunDir = normalize(vec3(0.0, 0.07, -1.0));
  float angle = acos(clamp(dot(dir, sunDir), -1.0, 1.0));
  float sunR = 0.15;

  // Pink atmospheric glow
  color += vec3(1.08, 0.52, 0.86) * exp(-angle * 4.9) * 0.46;

  if (angle < sunR) {
    float yNorm = clamp((dir.y - sunDir.y) / sunR * 0.5 + 0.5, 0.0, 1.0);

    // Magenta bottom -> soft pink top
    vec3 sunColor = mix(vec3(2.0, 0.58, 1.35), vec3(0.9, 1.6, 0.3), yNorm);

    // Horizontal scan lines in lower half, denser toward bottom
    float scanMask = 1.0;
    // if (dir.y < sunDir.y) {
    //   float t = clamp((sunDir.y - dir.y) / sunR, 0.0, 1.0);
    //   float band = floor(t * t * 12.0);
    //   scanMask = 1.0 - mod(band, 2.0);
    // }

    float edge = smoothstep(sunR, sunR * 0.88, angle);
    color = mix(color, sunColor, scanMask * edge);
  }

  // === FBM CLOUDS ===
  if (h > 0.02) {
    vec2 uv = dir.xz / max(h, 0.05);
    vec2 p = uv * 2.2;

    // Domain warping for organic, fluffy shapes
    vec2 warp = vec2(fbm(p + vec2(1.7, 9.2)), fbm(p + vec2(8.3, 2.8)));
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
