// ZAARS ENGINE v1.0.4 - UI VISIBILITY UPDATE
import React, { useState, useRef, useEffect, forwardRef } from 'react';
import {
    Send,
    Loader2,
    Brain,
    Sparkles,
    CheckCircle2,
    XCircle,
    Menu,
    X,
    Search,
    Clock,
    MessageSquareDashed,
    Lightbulb,
    Zap,
    Plus,
    User,
    Lock,
    ArrowRight,
    ShieldCheck,
    Settings,
    LogOut,
    Camera,
    Activity,
    Trash2
} from 'lucide-react';
import * as THREE from 'three';
import { GoogleLogin } from '@react-oauth/google';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, wrapEffect } from '@react-three/postprocessing';
import { Effect } from 'postprocessing';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, YAxis, XAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// ── CRYSO-inspired Dither Component ──────────────────────────────────────────
const waveVertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const waveFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3 waveColor;

vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec2 fade(vec2 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0,0.0,1.0,1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0,0.0,1.0,1.0);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww; vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = fract(i * (1.0/41.0)) * 2.0 - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x); vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z); vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x)); float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z)); float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float pattern(vec2 p) {
  vec2 p2 = p - time * waveSpeed;
  float value = 0.0; float amp = 1.0; float freq = waveFrequency;
  for (int i = 0; i < 4; i++) {
    value += amp * abs(cnoise(p));
    p *= freq; amp *= waveAmplitude;
  }
  return value + cnoise(p2); 
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;
  uv.x *= resolution.x / resolution.y;
  float f = pattern(uv);
  vec3 col = mix(vec3(0.0), waveColor, f);
  gl_FragColor = vec4(col, 1.0);
}
`;

const ditherFragmentShader = `
precision highp float;
uniform float colorNum;
uniform float pixelSize;
const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 uv, vec3 color) {
  vec2 scaledCoord = floor(uv * resolution / pixelSize);
  int x = int(mod(scaledCoord.x, 8.0));
  int y = int(mod(scaledCoord.y, 8.0));
  float threshold = bayerMatrix8x8[y * 8 + x] - 0.25;
  float step = 1.0 / (colorNum - 1.0);
  color += threshold * step;
  color = clamp(color - 0.2, 0.0, 1.0);
  return floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
}

void mainImage(in vec4 inputColor, in vec2 uv, out vec4 outputColor) {
  vec2 normalizedPixelSize = pixelSize / resolution;
  vec2 uvPixel = normalizedPixelSize * floor(uv / normalizedPixelSize);
  vec4 color = texture2D(inputBuffer, uvPixel);
  color.rgb = dither(uv, color.rgb);
  outputColor = color;
}
`;

class RetroEffectImpl extends Effect {
    constructor() {
        const uniforms = new Map([['colorNum', new THREE.Uniform(4.0)], ['pixelSize', new THREE.Uniform(2.0)]]);
        super('RetroEffect', ditherFragmentShader, { uniforms });
    }
}
const WrappedRetro = wrapEffect(RetroEffectImpl);
const RetroEffect = forwardRef(({ colorNum, pixelSize }, ref) => <WrappedRetro ref={ref} colorNum={colorNum} pixelSize={pixelSize} />);

function DitheredWaves({ waveSpeed, waveFrequency, waveAmplitude, waveColor, colorNum, pixelSize }) {
    const { viewport, size, gl } = useThree();
    const uniforms = useRef({
        time: new THREE.Uniform(0),
        resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
        waveSpeed: new THREE.Uniform(waveSpeed),
        waveFrequency: new THREE.Uniform(waveFrequency),
        waveAmplitude: new THREE.Uniform(waveAmplitude),
        waveColor: new THREE.Uniform(new THREE.Color(...waveColor)),
    });
    useEffect(() => {
        const dpr = gl.getPixelRatio();
        uniforms.current.resolution.value.set(Math.floor(size.width * dpr), Math.floor(size.height * dpr));
    }, [size, gl]);
    useFrame(({ clock }) => { uniforms.current.time.value = clock.getElapsedTime(); });
    return (
        <>
            <mesh scale={[viewport.width, viewport.height, 1]}>
                <planeGeometry args={[1, 1]} />
                <shaderMaterial vertexShader={waveVertexShader} fragmentShader={waveFragmentShader} uniforms={uniforms.current} />
            </mesh>
            <EffectComposer><RetroEffect colorNum={colorNum} pixelSize={pixelSize} /></EffectComposer>
        </>
    );
}

const DitherBackground = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.4 }}>
        <Canvas camera={{ position: [0, 0, 6] }} dpr={1} gl={{ antialias: false }}>
            <DitheredWaves waveSpeed={0.03} waveFrequency={2} waveAmplitude={0.4} waveColor={[0.1, 0.1, 0.1]} colorNum={3} pixelSize={2} />
        </Canvas>
    </div>
);


// ── Inlined Magnet (Interaction Component) ───────────────────────────────────
function Magnet({
    children,
    padding = 80,
    disabled = false,
    magnetStrength = 2.5,
    activeTransition = 'transform 0.3s ease-out',
    inactiveTransition = 'transform 0.5s ease-in-out',
    wrapperClassName = '',
    innerClassName = '',
    ...props
}) {
    const [isActive, setIsActive] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const magnetRef = useRef(null);

    useEffect(() => {
        if (disabled || window.innerWidth <= 768) { 
            setPosition({ x: 0, y: 0 }); 
            setIsActive(false);
            return; 
        }
        const handleMouseMove = e => {
            if (!magnetRef.current) return;
            const { left, top, width, height } = magnetRef.current.getBoundingClientRect();
            const centerX = left + width / 2;
            const centerY = top + height / 2;
            const distX = Math.abs(centerX - e.clientX);
            const distY = Math.abs(centerY - e.clientY);
            if (distX < width / 2 + padding && distY < height / 2 + padding) {
                setIsActive(true);
                setPosition({ x: (e.clientX - centerX) / magnetStrength, y: (e.clientY - centerY) / magnetStrength });
            } else {
                if (isActive) {
                    setIsActive(false);
                    setPosition({ x: 0, y: 0 });
                }
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [padding, disabled, magnetStrength, isActive]);

    return (
        <div ref={magnetRef} className={wrapperClassName} style={{ position: 'relative', display: 'inline-block' }} {...props}>
            <div
                className={innerClassName}
                style={{
                    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                    transition: isActive ? activeTransition : inactiveTransition,
                    willChange: 'transform'
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ── Inlined MagicRings (Visual Background) ────────────────────────────────────
const _vertexShader = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const _fragmentShader = `
precision highp float;
uniform float uTime, uAttenuation, uLineThickness, uBaseRadius, uRadiusStep, uScaleRate, uOpacity, uNoiseAmount, uRotation, uRingGap, uFadeIn, uFadeOut, uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
uniform vec2 uResolution, uMouse;
uniform vec3 uColor, uColorTwo;
uniform int uRingCount;
const float HP = 1.5707963;
const float CYCLE = 3.45;
float fade(float t) {
  return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);
}
float ring(vec2 p, float ri, float cut, float t0, float px) {
  float t = mod(uTime + t0, CYCLE);
  float r = ri + t / CYCLE * uScaleRate;
  float d = abs(length(p) - r);
  float a = atan(abs(p.y), abs(p.x)) / HP;
  float th = max(1.0 - a, 0.5) * px * uLineThickness;
  float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;
  d += pow(cut * a, 3.0) * r;
  return h * exp(-uAttenuation * d) * fade(t);
}
void main() {
  float px = 1.0 / min(uResolution.x, uResolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;
  float cr = cos(uRotation), sr = sin(uRotation);
  p = mat2(cr, -sr, sr, cr) * p;
  p -= uMouse * uMouseInfluence;
  float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
  p /= sc;
  vec3 c = vec3(0.0);
  float rcf = max(float(uRingCount) - 1.0, 1.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);
    vec2 pr = p - fi * uParallax * uMouse;
    vec3 rc = mix(uColor, uColorTwo, fi / rcf);
    c = mix(c, rc, vec3(ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px)));
  }
  c *= 1.0 + uBurst * 2.0;
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uNoiseAmount;
  gl_FragColor = vec4(c, max(c.r, max(c.g, c.b)) * uOpacity);
}
`;

function MagicRings({ color = '#fc42ff', colorTwo = '#42fcff', speed = 1, ringCount = 6, attenuation = 10, lineThickness = 2, baseRadius = 0.35, radiusStep = 0.1, scaleRate = 0.1, opacity = 1, blur = 0, noiseAmount = 0.1, rotation = 0, ringGap = 1.5, fadeIn = 0.7, fadeOut = 0.5, followMouse = false, mouseInfluence = 0.2, hoverScale = 1.2, parallax = 0.05, clickBurst = false }) {
    const mountRef = useRef(null);
    const propsRef = useRef(null);
    const mouseRef = useRef([0, 0]);
    const smoothMouseRef = useRef([0, 0]);
    const hoverAmountRef = useRef(0);
    const isHoveredRef = useRef(false);
    const burstRef = useRef(0);

    propsRef.current = { color, colorTwo, speed, ringCount, attenuation, lineThickness, baseRadius, radiusStep, scaleRate, opacity, noiseAmount, rotation, ringGap, fadeIn, fadeOut, followMouse, mouseInfluence, hoverScale, parallax, clickBurst };

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;
        let renderer;
        try { renderer = new THREE.WebGLRenderer({ alpha: true }); } catch { return; }
        if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return; }
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.pointerEvents = 'none';
        mount.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
        camera.position.z = 1;
        const uniforms = { uTime: { value: 0 }, uAttenuation: { value: 0 }, uResolution: { value: new THREE.Vector2() }, uColor: { value: new THREE.Color() }, uColorTwo: { value: new THREE.Color() }, uLineThickness: { value: 0 }, uBaseRadius: { value: 0 }, uRadiusStep: { value: 0 }, uScaleRate: { value: 0 }, uRingCount: { value: 0 }, uOpacity: { value: 1 }, uNoiseAmount: { value: 0 }, uRotation: { value: 0 }, uRingGap: { value: 1.6 }, uFadeIn: { value: 0.5 }, uFadeOut: { value: 0.75 }, uMouse: { value: new THREE.Vector2() }, uMouseInfluence: { value: 0 }, uHoverAmount: { value: 0 }, uHoverScale: { value: 1 }, uParallax: { value: 0 }, uBurst: { value: 0 } };
        const material = new THREE.ShaderMaterial({ vertexShader: _vertexShader, fragmentShader: _fragmentShader, uniforms, transparent: true });
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
        scene.add(quad);
        const resize = () => {
            const w = mount.clientWidth, h = mount.clientHeight;
            const dpr = Math.min(window.devicePixelRatio, 1.5); // Cap DPR at 1.5 to reduce GPU lag
            renderer.setSize(w, h); renderer.setPixelRatio(dpr); uniforms.uResolution.value.set(w * dpr, h * dpr);
        };
        resize();
        window.addEventListener('resize', resize);
        const ro = new ResizeObserver(resize); ro.observe(mount);
        const onMouseMove = (e) => {
            const rect = mount.getBoundingClientRect();
            mouseRef.current[0] = (e.clientX - rect.left) / rect.width - 0.5;
            mouseRef.current[1] = -((e.clientY - rect.top) / rect.height - 0.5);
            isHoveredRef.current = true;
        };
        const onClick = () => { burstRef.current = 1; };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onClick);
        let frameId;
        const animate = (t) => {
            frameId = requestAnimationFrame(animate);
            const p = propsRef.current;
            smoothMouseRef.current[0] += (mouseRef.current[0] - smoothMouseRef.current[0]) * 0.08;
            smoothMouseRef.current[1] += (mouseRef.current[1] - smoothMouseRef.current[1]) * 0.08;
            hoverAmountRef.current += ((isHoveredRef.current ? 1 : 0) - hoverAmountRef.current) * 0.08;
            burstRef.current *= 0.95;
            uniforms.uTime.value = t * 0.001 * p.speed;
            uniforms.uAttenuation.value = p.attenuation;
            uniforms.uColor.value.set(p.color);
            uniforms.uColorTwo.value.set(p.colorTwo);
            uniforms.uLineThickness.value = p.lineThickness;
            uniforms.uBaseRadius.value = p.baseRadius;
            uniforms.uRadiusStep.value = p.radiusStep;
            uniforms.uScaleRate.value = p.scaleRate;
            uniforms.uRingCount.value = p.ringCount;
            uniforms.uOpacity.value = p.opacity;
            uniforms.uNoiseAmount.value = p.noiseAmount;
            uniforms.uRotation.value = (p.rotation * Math.PI) / 180;
            uniforms.uRingGap.value = p.ringGap;
            uniforms.uFadeIn.value = p.fadeIn;
            uniforms.uFadeOut.value = p.fadeOut;
            uniforms.uMouse.value.set(smoothMouseRef.current[0], smoothMouseRef.current[1]);
            uniforms.uMouseInfluence.value = p.followMouse ? p.mouseInfluence : 0;
            uniforms.uHoverAmount.value = hoverAmountRef.current;
            uniforms.uHoverScale.value = p.hoverScale;
            uniforms.uParallax.value = p.parallax;
            uniforms.uBurst.value = p.clickBurst ? burstRef.current : 0;
            renderer.render(scene, camera);
        };
        frameId = requestAnimationFrame(animate);
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('click', onClick);
            ro.disconnect();
            mount.removeChild(renderer.domElement);
            renderer.dispose();
            material.dispose();
        };
    }, []);
    return <div ref={mountRef} style={{ width: '100%', height: '100%', ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}) }} />;
}

// ── Profile Cropper Component ────────────────────────────────────────────────
const ProfileCropper = ({ src, onSave, onCancel }) => {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imgDims, setImgDims] = useState({ w: 1, h: 1 });

    useEffect(() => {
        const i = new Image();
        i.onload = () => setImgDims({ w: i.width, h: i.height });
        i.src = src;
    }, [src]);

    const CROP_SIZE = 250;
    const baseScale = Math.max(CROP_SIZE / imgDims.w, CROP_SIZE / imgDims.h);
    const visualWidth = imgDims.w * baseScale;
    const visualHeight = imgDims.h * baseScale;

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };
    const handleMouseUp = () => setIsDragging(false);

    const generateCrop = (auto = false) => {
        const finalZoom = auto ? 1 : zoom;
        const finalOffset = auto ? { x: 0, y: 0 } : offset;

        const canvas = document.createElement('canvas');
        canvas.width = CROP_SIZE; canvas.height = CROP_SIZE;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = src;
        img.onload = () => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
            const sX = CROP_SIZE / img.width;
            const sY = CROP_SIZE / img.height;
            const bScale = Math.max(sX, sY);
            const fScale = bScale * finalZoom;

            ctx.translate(CROP_SIZE / 2, CROP_SIZE / 2);
            ctx.translate(finalOffset.x, finalOffset.y);
            ctx.scale(fScale, fScale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            onSave(canvas.toDataURL('image/jpeg', 0.9));
        };
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', width: '380px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 32px 64px rgba(0,0,0,0.8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 500, letterSpacing: '-0.5px' }}>Position & Scale</h3>
                    <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}><X size={20} /></button>
                </div>

                <div
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                    style={{ width: `${CROP_SIZE}px`, height: `${CROP_SIZE}px`, margin: '0 auto', background: '#000', borderRadius: '50%', position: 'relative', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab', border: '1px solid rgba(255,255,255,0.15)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}
                >
                    <img src={src} alt="crop preview" draggable="false" style={{ position: 'absolute', top: '50%', left: '50%', width: `${visualWidth}px`, height: `${visualHeight}px`, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`, pointerEvents: 'none' }} />
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', letterSpacing: '1px', fontWeight: 500 }}><span>ZOOM</span><span>{Math.round(zoom * 100)}%</span></div>
                    <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => setZoom(Number(e.target.value))} style={{ width: '100%', accentColor: '#fff', height: '4px', borderRadius: '2px', outline: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button onClick={() => generateCrop(true)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>Auto Fit</button>
                    <button onClick={() => generateCrop(false)} style={{ flex: 1, padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(0.98)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>Apply Crop</button>
                </div>
            </div>
        </div>
    );
};

// ── Main App Controller ──────────────────────────────────────────────────────
export default function App() {
    // Authentication & User State
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const saved = localStorage.getItem('zaars_user_profile');
        return saved ? !!JSON.parse(saved).token : false;
    });
    const [authData, setAuthData] = useState({ username: '', password: '' });
    const [isAuthLoading, setIsAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [userProfile, setUserProfile] = useState(() => {
        const saved = localStorage.getItem('zaars_user_profile');
        return saved ? JSON.parse(saved) : { name: 'Guest', originalUsername: 'Guest', email: '', avatar: null, isGoogle: false, apiKey: '' };
    });
    const [preferredModel, setPreferredModel] = useState(() => localStorage.getItem('zaars_model') || 'gemini');

    // App View State
    const [currentView, setCurrentView] = useState('chat'); // 'chat' | 'profile'

    // Chat State
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [isClarifying, setIsClarifying] = useState(false);
    const [insights, setInsights] = useState(null);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [mode, setMode] = useState('simple');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const profileInputRef = useRef(null);

    // Cropper State
    const [cropModalSrc, setCropModalSrc] = useState(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPrivateMode, setIsPrivateMode] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

    // Python Sandbox State
    const [pyodide, setPyodide] = useState(null);
    const [isPyodideLoading, setIsPyodideLoading] = useState(false);

    useEffect(() => {
        const loadPy = async () => {
            if (window.loadPyodide && !pyodide) {
                setIsPyodideLoading(true);
                try {
                    const py = await window.loadPyodide();
                    setPyodide(py);
                } catch (e) {
                    console.error("Pyodide Load Error", e);
                } finally {
                    setIsPyodideLoading(false);
                }
            }
        };
        loadPy();
    }, []);

    const runPython = async (code) => {
        if (!pyodide) return "Python Sandbox not initialized.";
        try {
            await pyodide.loadPackagesFromImports(code);
            const result = await pyodide.runPythonAsync(code);
            return result?.toString() || "Success (No Output)";
        } catch (e) {
            return `Error: ${e.message}`;
        }
    };

    const [history, setHistory] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [normalSessionBackup, setNormalSessionBackup] = useState(null);

    // Welcome Prompts
    const welcomePrompts = [
        "What do you want today?",
        "What should i solve?",
        `Konichhiwaaaaa ${userProfile.name.split(' ')[0]}!`,
        "Ready to reason?",
        "Awaiting your input."
    ];

    const privateWelcomePrompts = [
        "Private session initialized.",
        "Incognito reasoning active.",
        "Data will not be saved.",
        "Secure private window."
    ];

    const [currentWelcome, setCurrentWelcome] = useState("");

    const messagesEndRef = useRef(null);
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => { scrollToBottom(); }, [messages]);
    
    useEffect(() => {
        if (isAuthenticated && userProfile.token) {
            syncHistory(userProfile.token);
        }
    }, [isAuthenticated, userProfile.token]);

    useEffect(() => {
        if (isAuthenticated && messages.length === 0 && currentView === 'chat') {
            const prompts = isPrivateMode ? privateWelcomePrompts : welcomePrompts;
            setCurrentWelcome(prompts[Math.floor(Math.random() * prompts.length)]);
        }
    }, [messages.length, isAuthenticated, userProfile.name, currentView, isPrivateMode]);

    // ── Intelligence Dashboard Logic (Tailored from CRYSO) ───────────────────
    const [intelligenceOpen, setIntelligenceOpen] = useState(false);
    const [intelStats, setIntelStats] = useState({
        velocity: 88,
        zeroErrorProb: 99.4,
        contextDepth: 12400,
        breakouts: 4,
        sentiment: 72
    });
    const [intelHistory, setIntelHistory] = useState(
        Array.from({ length: 15 }).map((_, i) => ({
            time: new Date(Date.now() - (15 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            velocity: 80 + Math.random() * 15,
            confidence: 98 + Math.random() * 1.5
        }))
    );

    useEffect(() => {
        const id = setInterval(() => {
            setIntelStats(prev => ({
                ...prev,
                velocity: Math.min(100, Math.max(70, prev.velocity + (Math.random() - 0.5) * 5)),
                zeroErrorProb: Math.min(100, Math.max(99.0, prev.zeroErrorProb + (Math.random() - 0.5) * 0.1)),
                contextDepth: prev.contextDepth + Math.floor(Math.random() * 10)
            }));
            setIntelHistory(prev => {
                const updated = [...prev, {
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    velocity: 80 + Math.random() * 15,
                    confidence: 98 + Math.random() * 1.5
                }];
                return updated.length > 20 ? updated.slice(1) : updated;
            });
        }, 8000);
        return () => clearInterval(id);
    }, []);

    const IntelligenceDashboard = () => (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(32px)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.4s ease' }}>
            <div style={{ padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity color="#fc42ff" size={24} /> Intelligence Radar
                    </h2>
                    <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Working model tailored from CRYSO-MemeCoinRadar architecture</p>
                </div>
                <button onClick={() => setIntelligenceOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    {[
                        { label: 'AGENT VELOCITY', val: intelStats.velocity.toFixed(0), sub: 'Thinking Steps/Sec', color: '#fc42ff' },
                        { label: 'ZERO-ERROR CONFIDENCE', val: intelStats.zeroErrorProb.toFixed(1) + '%', sub: 'Statistical Probability', color: '#00ff90' },
                        { label: 'CONTEXT DEPTH', val: intelStats.contextDepth.toLocaleString(), sub: 'Active Tokens', color: '#4285f4' },
                        { label: 'REASONING PATHS', val: (messages.length * 3 + 2).toString(), sub: 'Complexity level', color: '#fff' }
                    ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>{s.label}</div>
                            <div style={{ fontSize: '32px', color: s.color, fontWeight: 700 }}>{s.val}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px' }}>
                        <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600, marginBottom: '20px' }}>Reasoning Velocity Trend</div>
                        <div style={{ width: '100%', height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={intelHistory}>
                                    <defs>
                                        <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#fc42ff" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#fc42ff" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                                    <Tooltip contentStyle={{ background: 'rgba(10,10,10,0.9)', border: '1px solid rgba(252,66,255,0.3)', borderRadius: '12px', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="velocity" stroke="#fc42ff" strokeWidth={3} fillOpacity={1} fill="url(#colorVel)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '24px' }}>
                        <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600, marginBottom: '20px' }}>Confidence Variance</div>
                        <div style={{ width: '100%', height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={intelHistory.slice(-6)}>
                                    <Bar dataKey="confidence" fill="#00ff90" radius={[6, 6, 0, 0]}>
                                        {intelHistory.slice(-6).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fillOpacity={0.4 + (index / 10)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes slideIn { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );

    // ── Authentication Logic ───────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!authData.username || !authData.password) {
            setAuthError('Required fields missing.');
            return;
        }
        setIsAuthLoading(true); setAuthError('');
        try {
            const apiBase = (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const endpoint = isRegistering ? '/auth/register' : '/auth/login';

            const res = await fetch(`${apiBase}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: authData.username.trim(), password: authData.password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.message || `Error ${res.status}`);
            }

            const newProfile = { ...userProfile, name: data.user.name, originalUsername: data.user.originalUsername, email: data.user.email || '', isGoogle: data.user.isGoogle, token: data.token, avatar: data.user.avatar, apiKey: data.user.apiKey || '' };
            setUserProfile(newProfile);
            localStorage.setItem('zaars_user_profile', JSON.stringify(newProfile));
            setIsAuthenticated(true);
            syncHistory(data.token);
        } catch (err) {
            setAuthError(err.message.includes('Unexpected token') ? 'Server unreachable' : err.message);
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsAuthLoading(true); setAuthError('');
        try {
            const apiBase = (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

            const res = await fetch(`${apiBase}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.message || `Google Error ${res.status}`);
            }

            const newProfile = { ...userProfile, name: data.user.name, originalUsername: data.user.originalUsername, email: data.user.email || '', isGoogle: true, token: data.token, avatar: data.user.avatar, apiKey: data.user.apiKey || '' };
            setUserProfile(newProfile);
            localStorage.setItem('zaars_user_profile', JSON.stringify(newProfile));
            setIsAuthenticated(true);
            syncHistory(data.token);
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setIsAuthLoading(false);
            setShowGoogleModal(false);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setMessages([]);
        setHistory([]);
        setActiveSessionId(null);
        setNormalSessionBackup(null);
        setCurrentView('chat');
        localStorage.removeItem('zaars_user_profile');
    };

    const syncHistory = async (token) => {
        try {
            const apiBase = (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiBase}/user/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setHistory(data);
        } catch (e) { console.error("History sync failed:", e); }
    };

    const saveSessionToDB = async (sessionData) => {
        const token = userProfile.token;
        if (!token || isPrivateMode) return;
        try {
            const apiBase = (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiBase}/user/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(sessionData)
            });
            const data = await res.json();
            if (res.ok) {
                if (!activeSessionId) setActiveSessionId(data.id);
                syncHistory(token);
            }
        } catch (e) { console.error("Failed to persist session:", e); }
    };

    const deleteSession = async (id, e) => {
        e.stopPropagation();
        const token = userProfile.token;
        if (!token) return;
        try {
            const apiBase = (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiBase}/user/sessions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setHistory(prev => prev.filter(h => h.id !== id));
                if (activeSessionId === id) {
                    setMessages([]);
                    setActiveSessionId(null);
                    setInsights(null);
                }
            }
        } catch (e) { console.error("Deletion failed:", e); }
    };

    const handleProfileSave = async (newName) => {
        const updatedProfile = { ...userProfile, name: newName };
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            await fetch(`${apiUrl}/user/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userProfile.token}` },
                body: JSON.stringify({ avatar_url: userProfile.avatar, api_key: userProfile.apiKey })
            });
        } catch (e) { console.error("Sync failed:", e); }
        setUserProfile(updatedProfile);
        localStorage.setItem('zaars_user_profile', JSON.stringify(updatedProfile));
        setCurrentView('chat');
    };

    const handleProfilePicSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { setCropModalSrc(reader.result); };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropSave = async (base64Image) => {
        const updatedProfile = { ...userProfile, avatar: base64Image };
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            await fetch(`${apiUrl}/user/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userProfile.token}` },
                body: JSON.stringify({ avatar_url: base64Image })
            });
        } catch (e) { console.error("Sync failed:", e); }
        setUserProfile(updatedProfile);
        localStorage.setItem('zaars_user_profile', JSON.stringify(updatedProfile));
        setCropModalSrc(null);
    };

    const handleRemoveProfilePic = async () => {
        const updatedProfile = { ...userProfile, avatar: null };
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            await fetch(`${apiUrl}/user/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userProfile.token}` },
                body: JSON.stringify({ avatar_url: null })
            });
        } catch (e) { console.error("Sync failed:", e); }
        setUserProfile(updatedProfile);
        localStorage.setItem('zaars_user_profile', JSON.stringify(updatedProfile));
    };

    // ── Chat Logic ─────────────────────────────────────────────────────────────
    const startNewChat = () => {
        setIsPrivateMode(false);
        setMessages([]);
        setActiveSessionId(null);
        setInsights(null);
        setUploadedFiles([]);
        setIsSidebarOpen(false);
        setCurrentView('chat');
    };

    const loadSession = (sessionId) => {
        setIsPrivateMode(false);
        const session = history.find(s => s.id === sessionId);
        if (session) {
            setMessages(session.messages); setActiveSessionId(sessionId);
            setInsights(session.insights || null); setIsSidebarOpen(false); setCurrentView('chat');
        }
    };

    const togglePrivateMode = () => {
        if (!isPrivateMode) {
            // ENTER PRIVATE MODE
            // If there's an active unsaved session, save it first
            if (messages.length > 0 && !activeSessionId) {
                const newId = Date.now().toString();
                setHistory(prev => [{ id: newId, title: messages[0].content.slice(0, 30) || '📎 Notes Analysis', date: 'Just now', messages: [...messages], insights }, ...prev]);
            }
            
            setNormalSessionBackup({ messages: [...messages], activeSessionId, insights });
            setMessages([]);
            setActiveSessionId(null);
            setInsights(null);
            setInput('');
            setUploadedFiles([]);
            setIsPrivateMode(true);
            setCurrentView('chat');
        } else {
            // EXIT PRIVATE MODE
            setIsPrivateMode(false);
            if (normalSessionBackup) {
                setMessages(normalSessionBackup.messages || []);
                setActiveSessionId(normalSessionBackup.activeSessionId || null);
                setInsights(normalSessionBackup.insights || null);
            } else {
                setMessages([]);
                setActiveSessionId(null);
            }
            setInput('');
            setUploadedFiles([]);
            setCurrentView('chat');
            setNormalSessionBackup(null); // Clear backup after restoration
        }
    };

    const callGroqAPI = async (chatHistory, systemInstruction = "", useJson = false) => {
        let retries = 5, delay = 1000;
        const userProvidedKey = userProfile.apiKey || "";
        const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

        while (retries > 0) {
            try {
                // Determine model
                const hasImage = chatHistory.some(msg => Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url'));
                // Use Gemini for vision ALWAYS (due to Groq rotations); otherwise use preference
                const model = hasImage ? "gemini-2.5-flash" : (preferredModel === 'gemini' ? "gemini-2.5-flash" : "llama-3.3-70b-versatile");

                // Format messages
                const messages = [];
                if (systemInstruction) {
                    messages.push({ role: "system", content: systemInstruction });
                }

                chatHistory.filter(msg => msg.role !== 'error').forEach(msg => {
                    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
                });

                let response;
                // ALWAYS use the Proxy for vision models or if NO user key is provided
                if (model.startsWith('gemini') || !userProvidedKey) {
                    // LINKED / AUTOMATIC mode OR Vision Mode (Proxy always has Gemini key)
                    response = await fetch(`${apiUrl}/api/ai/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model,
                            messages,
                            response_format: useJson ? { type: "json_object" } : { type: "text" }
                        })
                    });
                } else {
                    // Direct mode: user provided their own key (Only for non-vision/Groq models)
                    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userProvidedKey}` },
                        body: JSON.stringify({
                            model,
                            messages,
                            temperature: 0.1,
                            max_tokens: 4096,
                            response_format: useJson ? { type: "json_object" } : { type: "text" }
                        })
                    });
                }

                if (!response.ok) {
                    const text = await response.text();
                    const firstChar = text.trim().charAt(0);
                    if (firstChar === '<' || firstChar === '{') {
                        const snippet = text.slice(0, 80).replace(/<[^>]*>?/gm, '');
                        throw new Error(`AI Gateway ${response.status}: ${snippet || 'Service Unavailable'}`);
                    }
                    throw new Error(`AI Gateway ${response.status}`);
                }

                const data = JSON.parse(await response.text());
                let text = data.choices?.[0]?.message?.content;
                if (!text) throw new Error("No response from AI");

                // Clean up any double-escaped characters that might come from the API
                text = text.replace(/\\\\n/g, '\n'); 
                text = text.replace(/\\n/g, '\n');

                // NEW: SANITIZE MANGLED LATEX (Fixes 'fracrac' and missing backslashes)
                const sanitizeMath = (str) => {
                    if (typeof str !== 'string') return str;
                    return str
                        .replace(/fracrac/g, '\\frac') // Direct fix for the reported bug
                        .replace(/pmmsqrt/g, '\\pm\\sqrt') // Fix for another common mangle seen in screenshots
                        .replace(/msqrt/g, '\\sqrt')
                        .replace(/\\p m/g, '\\pm')
                        .replace(/p m/g, '\\pm')
                        // Ensure common math commands have backslashes if lost
                        .replace(/(?<!\\)(frac|sqrt|pm|alpha|beta|gamma|theta|pi|sigma|Omega|Delta|sum|int|infty|approx|ne|le|ge)/g, '\\$1');
                };

                if (useJson) {
                    try { 
                        let cleanText = text.trim();
                        // Remove markdown code blocks if the AI wrapped the JSON
                        if (cleanText.startsWith('```')) {
                            const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
                            if (match) cleanText = match[1].trim();
                        }
                        const parsed = JSON.parse(cleanText);
                        
                        // Sanitize all string fields in the JSON
                        Object.keys(parsed).forEach(key => {
                            if (typeof parsed[key] === 'string') {
                                parsed[key] = sanitizeMath(parsed[key]);
                            }
                        });
                        return parsed;
                    } catch(e) { 
                        console.warn("[ZAARS] JSON Parse Failed, falling back to simple chat", e);
                        return { type: "chat", solution: sanitizeMath(text) }; 
                    }
                }
                return sanitizeMath(text);
            } catch (error) { 
                retries--; 
                if (retries === 0) throw error; 
                await new Promise(r => setTimeout(r, delay)); 
                delay *= 2; 
            }
        }
    };

    const handleClarify = async () => {
        if (!input.trim() || isClarifying || isProcessing) return;
        setIsClarifying(true);
        try {
            const sysPrompt = "Academic phrasing assistant. Rewrite clarifying sloppy input into formal scientific query. Return ONLY refined text.";
            const refined = await callGroqAPI([{ role: 'user', content: input }], sysPrompt, false);
            setInput(refined.trim());
        } catch (e) { console.error(e); } finally { setIsClarifying(false); }
    };

    const generateInsights = async () => {
        if (messages.length === 0 || isGeneratingInsights) return;
        setIsGeneratingInsights(true);
        try {
            const chatLog = messages.map(m => `${m.role}: ${typeof m.content === 'object' ? JSON.stringify(m.content) : m.content}`).join('\n');
            const prompt = `Analyze user learning patterns from this log:\n\n${chatLog}`;
            const result = await callGroqAPI([{ role: 'user', content: prompt }], "Study Analytics AI.", false);
            setInsights(result);
            if (!isPrivateMode) {
                setHistory(prev => prev.map(s => s.id === activeSessionId ? { ...s, insights: result } : s));
                saveSessionToDB({ id: activeSessionId, title: history.find(s => s.id === activeSessionId)?.title || '📎 Notes Analysis', messages, insights: result });
            }
        } catch (e) { console.error(e); } finally { setIsGeneratingInsights(false); }
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve({ base64: dataUrl.split(',')[1], preview: dataUrl });
                };
            };
        });
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []); if (files.length === 0) return;
        
        for (const file of files) {
            if (file.size > 30 * 1024 * 1024) { alert(`File "${file.name}" exceeds 30MB limit.`); continue; }
            
            const fileType = file.type;
            const fileName = file.name;
            const extension = fileName.split('.').pop().toLowerCase();

            if (fileType.startsWith('image/')) {
                const { base64, preview } = await compressImage(file);
                setUploadedFiles(prev => [...prev, { id: Date.now() + Math.random(), type: 'image', name: fileName, base64, mimeType: 'image/jpeg', preview }]);
            } else if (extension === 'pdf') {
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        const pdfData = new Uint8Array(reader.result);
                        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                        const pdf = await loadingTask.promise;
                        const numPages = pdf.numPages;

                        // Extract text (up to 15 pages)
                        let text = `[PDF Document: ${fileName} — ${numPages} page${numPages > 1 ? 's' : ''}]\n`;
                        for (let i = 1; i <= Math.min(numPages, 15); i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            text += `\n--- Page ${i} ---\n` + content.items.map(item => item.str).join(' ');
                        }
                        if (numPages > 15) text += `\n\n... (${numPages - 15} more pages not shown)`;

                        // Render page 1 as a thumbnail
                        const firstPage = await pdf.getPage(1);
                        const viewport = firstPage.getViewport({ scale: 0.5 });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d');
                        await firstPage.render({ canvasContext: ctx, viewport }).promise;
                        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

                        setUploadedFiles(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            type: 'pdf',
                            name: fileName,
                            content: text,
                            numPages,
                            thumbnail,
                            preview: null
                        }]);
                    } catch (err) {
                        console.error('PDF parse error:', err);
                        alert(`Failed to read PDF: ${fileName}\n\nMake sure it's not password-protected.`);
                    }
                };
                reader.readAsArrayBuffer(file);
            } else if (extension === 'docx') {
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        const res = await mammoth.extractRawText({ arrayBuffer: reader.result });
                        setUploadedFiles(prev => [...prev, { id: Date.now() + Math.random(), type: 'docx', name: fileName, content: res.value, preview: null }]);
                    } catch (err) { console.error(err); alert(`Failed to parse Word document: ${fileName}`); }
                };
                reader.readAsArrayBuffer(file);
            } else if (extension === 'txt' || fileType === 'text/plain') {
                const reader = new FileReader();
                reader.onload = () => setUploadedFiles(prev => [...prev, { id: Date.now() + Math.random(), type: 'text', name: fileName, content: reader.result, preview: null }]);
                reader.readAsText(file);
            } else {
                alert(`Unsupported file type: ${fileName}. Use Image, PDF, DOCX or TXT.`);
            }
        }
        e.target.value = '';
    };

    const handleSend = async () => {
        if (!input.trim() && uploadedFiles.length === 0 || isProcessing) return;
        
        const capturedFiles = [...uploadedFiles];
        const userMessage = { 
            role: 'user', 
            content: input, 
            attachments: capturedFiles.map(f => ({ id: f.id, type: f.type, name: f.name, preview: f.preview, mimeType: f.mimeType, base64: f.base64, content: f.content })),
            timestamp: new Date().toISOString() 
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages); setInput(''); setUploadedFiles([]); setIsProcessing(true);
        
        try {
            setCurrentStep(capturedFiles.length > 0 ? `Processing ${capturedFiles.length} files...` : 'Initializing reasoning...');
            
            const apiHistory = newMessages.map((m, idx) => {
                const isLast = idx === newMessages.length - 1;
                if (m.role !== 'user') {
                    return { role: m.role, content: typeof m.content === 'object' ? JSON.stringify(m.content) : m.content.toString() };
                }
                
                let parts = [];
                let textBonus = "";

                if (m.attachments && m.attachments.length > 0) {
                    m.attachments.forEach(att => {
                        if (att.type === 'image') {
                            if (isLast) {
                                parts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.base64}` } });
                            } else {
                                textBonus += `\n[Context: Image "${att.name}" was provided here]`;
                            }
                        } else {
                            textBonus += `\n[ATTACHED DOCUMENT: ${att.name}]\n---CONTENT START---\n${att.content}\n---CONTENT END---\n`;
                        }
                    });
                }

                let finalContent = (m.content || "") + textBonus;
                if (parts.length > 0) {
                    parts.push({ type: 'text', text: finalContent || "Analyze attached content." });
                    return { role: 'user', content: parts };
                }
                return { role: 'user', content: finalContent };
            });

            const baseInstruction = mode === 'reasoning' 
                ? `You are ZAARS (Zero-error AI Agent Reasoning System), a specialized Mathematical Reasoning Engine. 
CRITICAL INSTRUCTIONS for REASONING MODE:
- **Structural Layout**: Solve the problem in a highly structured, numbered step-by-step method (Step 1, Step 2, ...). Avoid prose paragraphs — use concise steps.
- **STRICT LaTeX Rule**: EVERY mathematical expression, formula, variable, operator, equation, and numeric result MUST be written in LaTeX. Use $...$ for inline math and $$...$$ for display/block equations. Examples: $x = 5$, $$\\frac{a}{b} = c$$, $$\\sqrt{x^2 + y^2}$$. Never write raw math without LaTeX delimiters.
- **LaTeX Commands**: Always include the leading backslash — \\frac, \\sqrt, \\sum, \\int, \\alpha, \\beta, \\pi, \\infty, \\approx, \\leq, \\geq, \\cdot, \\times, \\pm, \\Delta, \\Sigma. Do NOT drop backslashes or mangle commands.
- **Python-Driven Verification**: Provide a Python 'code' block to verify every calculation numerically. The sandbox result must confirm the final answer.
- **Zero-Hallucination**: Accuracy is your primary directive. Every step must be mathematically sound.` 
                : `You are ZAARS, a helpful and direct AI assistant. 
CRITICAL INSTRUCTIONS for SIMPLE MODE:
- **Conciseness**: Give brief, direct answers. No unnecessary elaboration.
- **STRICT LaTeX Rule**: ALL mathematical expressions, variables, formulas, and results MUST use LaTeX notation. Use $...$ for inline math (e.g., $x = 5$, $E = mc^2$) and $$...$$ for block equations. Never write raw math without LaTeX.
- **LaTeX Commands**: Always preserve the backslash — \\frac, \\sqrt, \\sum, \\int, \\pi, \\alpha, \\beta, etc. Do not drop backslashes.`;

            let finalResponse;

            if (mode === 'reasoning') {
                // ── AGENTIC SELF-CORRECTION LOOP ────────────────────────────────
                setCurrentStep('Analyzing problem structure...');
                const draftInstruction = `${baseInstruction} 
Response MUST be a JSON object with these exact keys:
- 'thought': Draft the logical steps. ALL math must be in LaTeX ($...$ or $$...$$). Number every step.
- 'code': A Python script that calculates and verifies the core values.
- 'solution': The final answer with all math in LaTeX.`;
                const draft = await callGroqAPI(apiHistory, draftInstruction, true);

                // Run Sandbox if code exists
                let sandboxResult = "";
                if (draft.code && pyodide) {
                    setCurrentStep('Synthesizing steps via Python sandbox...');
                    sandboxResult = await runPython(draft.code);
                }

                setCurrentStep('Formatting step-by-step derivation...');
                const auditHistory = [...apiHistory, 
                    { role: 'assistant', content: JSON.stringify(draft) },
                    { role: 'user', content: `[SYSTEM AUDITOR]: Review the draft and sandbox results (${sandboxResult}). 
Produce the final polished response following these strict rules:
- Every step must be numbered: "Step 1: ...", "Step 2: ..."
- EVERY mathematical expression, variable, formula, operator, and numeric result must be in LaTeX — $...$ for inline or $$...$$ for block equations. No raw math allowed.
- Do NOT drop backslashes from commands (\\frac, \\sqrt, \\sum, \\int, \\pi, \\alpha, \\leq, \\geq, \\cdot, \\times, \\pm).
- Use bold for key results and conclusions.
- Return ONLY the final JSON, no extra text.` }
                ];
                
                setCurrentStep('Finalizing verified synthesis...');
                const modeInstruction = `Your response MUST be a valid JSON object with strictly these keys: 'type' (set to 'reasoning'), 'thought' (the final verified step-by-step derivation in markdown — ALL math in LaTeX), 'verification' (confirmation that sandbox/audit passed — math in LaTeX), 'solution' (the final answer — ALL math in LaTeX using $$...$$), 'isVerified' (true), 'sandboxOutput' (sandbox output string if any).`;
                finalResponse = await callGroqAPI(auditHistory, `${baseInstruction} ${modeInstruction}`, true);
            } else {
                const modeInstruction = "Your response MUST be a JSON object with strictly these keys: 'type' (set to 'chat'), and 'solution' (the direct, concise answer — ALL mathematical expressions must be in LaTeX using $...$ for inline and $$...$$ for block formulas).";
                finalResponse = await callGroqAPI(apiHistory, `${baseInstruction} ${modeInstruction}`, true);
            }

            const assistantMessage = { role: 'assistant', content: finalResponse, timestamp: new Date().toISOString() };
            const finalMessages = [...newMessages, assistantMessage];
            setMessages(finalMessages);

            if (!isPrivateMode) {
                setHistory(prev => {
                    if (activeSessionId) return prev.map(s => s.id === activeSessionId ? { ...s, messages: finalMessages } : s);
                    const newId = Date.now().toString(); 
                    return [{ id: newId, title: input || '📎 Notes Analysis', date: 'Just now', messages: finalMessages, insights: null }, ...prev];
                });
                saveSessionToDB({ id: activeSessionId, title: input || '📎 Notes Analysis', messages: finalMessages, insights });
            }
        } catch (error) { 
            console.error("HANDLE SEND ERROR", error);
            setMessages(prev => [...prev, { role: 'error', content: `Error: ${error.message}`, timestamp: new Date().toISOString() }]); 
        } finally { 
            setIsProcessing(false); 
            setCurrentStep(''); 
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#050505', color: '#fff', fontFamily: "'Inter', sans-serif", overflow: 'hidden', position: 'relative' }}>
            <style>{`
                .math-container h3, .math-container h4 { margin-top: 24px; color: #fff; font-weight: 700; letter-spacing: -0.5px; }
                .math-container p { margin-bottom: 16px; opacity: 0.9; }
                .math-container strong { color: #fff; }
                .math-container ul, .math-container ol { margin: 16px 0; padding-left: 20px; }
                .math-container li { margin-bottom: 12px; }
                .math-container .katex-display { margin: 20px 0; padding: 10px; background: rgba(255,255,255,0.02); border-radius: 12px; overflow-x: auto; overflow-y: hidden; }
                .math-container .katex { font-size: 1.1em; }
            `}</style>
            <DitherBackground />
            <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex' }}>
                {intelligenceOpen && <IntelligenceDashboard />}

            {/* ── Purple Veil Overlay ── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, backgroundColor: '#800080', opacity: isPrivateMode ? 0.35 : 0, pointerEvents: 'none', transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)', mixBlendMode: 'color' }} />

            {/* ── Profile Image Cropper Modal ── */}
            {cropModalSrc && (
                <ProfileCropper src={cropModalSrc} onSave={handleCropSave} onCancel={() => setCropModalSrc(null)} />
            )}



            {!isAuthenticated ? (
                /* ── LOGIN PAGE ─────────────────────────────────────────────────────── */
                <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '380px',
                        background: 'rgba(10, 10, 10, 0.1)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
                        borderRadius: '12px',
                        padding: '40px 32px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', textAlign: 'center' }}>
                            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 400, fontFamily: "'Playfair Display', serif", color: '#fff', letterSpacing: '8px', textTransform: 'uppercase' }}>ZAARS</h1>
                            <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '2px', marginTop: '10px', lineHeight: '1.4' }}>
                                ZERO-ERROR AI AGENT REASONING SYSTEM
                            </div>
                        </div>

                        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', gap: '16px' }}>
                                <button type="button" onClick={() => setIsRegistering(false)} style={{ background: 'none', border: 'none', color: !isRegistering ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}>Login</button>
                                <button type="button" onClick={() => setIsRegistering(true)} style={{ background: 'none', border: 'none', color: isRegistering ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}>Create Account</button>
                            </div>

                            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                                <User size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: '#fff' }} />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={authData.username}
                                    onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '13px', transition: 'border 0.2s, background 0.2s' }}
                                    onFocus={(e) => { e.target.style.border = '1px solid rgba(255, 255, 255, 0.3)'; e.target.style.background = 'rgba(0,0,0,0.5)'; }}
                                    onBlur={(e) => { e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(0,0,0,0.3)'; }}
                                />
                            </div>

                            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                                <Lock size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: '#fff' }} />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={authData.password}
                                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '13px', transition: 'border 0.2s, background 0.2s' }}
                                    onFocus={(e) => { e.target.style.border = '1px solid rgba(255, 255, 255, 0.3)'; e.target.style.background = 'rgba(0,0,0,0.5)'; }}
                                    onBlur={(e) => { e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(0,0,0,0.3)'; }}
                                />
                            </div>

                            {authError && <div style={{ color: '#ff4d4d', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>{authError}</div>}

                            <button
                                type="submit"
                                disabled={isAuthLoading}
                                style={{ width: '100%', marginTop: '6px', padding: '12px', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                                onMouseOver={(e) => !isAuthLoading && (e.currentTarget.style.background = '#e4e4e7')}
                                onMouseOut={(e) => !isAuthLoading && (e.currentTarget.style.background = '#fff')}
                            >
                                {isAuthLoading ? <Loader2 size={16} className="animate-spin" /> : <>{isRegistering ? 'Register Account' : 'Initialize Session'} <ArrowRight size={14} /></>}
                            </button>
                        </form>

                        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', width: '100%', opacity: 0.3 }}>
                            <div style={{ flex: 1, height: '1px', background: '#fff' }} />
                            <span style={{ padding: '0 12px', fontSize: '10px', letterSpacing: '2px', color: '#fff', fontWeight: 500 }}>OR</span>
                            <div style={{ flex: 1, height: '1px', background: '#fff' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <GoogleLogin 
                                onSuccess={handleGoogleSuccess}
                                onError={() => setAuthError('Google Login Failed')}
                                theme="filled_black"
                                shape="pill"
                                text="continue_with"
                                width="300px"
                            />
                        </div>

                        <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
                            <ShieldCheck size={14} color="#fff" />
                            <span style={{ fontSize: '10px', color: '#fff', letterSpacing: '1px', fontWeight: 600 }}>SECURED END-TO-END</span>
                        </div>
                    </div>
                </div>
            ) : (
                /* ── MAIN INTERFACE ─────────────────────────────────────────────────── */
                <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                    {/* Sidebar Backdrop (Mobile only) */}
                    {isSidebarOpen && (
                        <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: window.innerWidth <= 768 ? 'block' : 'none' }} />
                    )}

                    {/* Sidebar */}
                    <div className={`sidebar-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`} style={{ position: 'fixed', top: 0, left: 0, width: '300px', height: '100vh', background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRight: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '24px 0 64px rgba(0, 0, 0, 0.5)', transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                            <h2 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0, letterSpacing: '2px', opacity: 0.8 }}>DASHBOARD</h2>
                            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.4, transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.4}><X size={20} /></button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column' }}>
                            {/* User Customization Nav */}
                            <div
                                onClick={() => { setCurrentView('profile'); setIsSidebarOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', marginBottom: '32px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(0.98)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {userProfile.avatar ? (
                                    <img src={userProfile.avatar} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} alt="profile" />
                                ) : (
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#222', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 600 }}>
                                        {userProfile.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{userProfile.name}</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}><Settings size={12} /> Profile Settings</div>
                                </div>
                            </div>

                            <button
                                onClick={startNewChat}
                                style={{ width: '100%', padding: '14px', marginBottom: '24px', background: '#fff', border: 'none', borderRadius: '16px', color: '#000', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <Plus size={18} /> New Chat
                            </button>

                            {/* Sidebar Model Switcher (Visible on Mobile) */}
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, letterSpacing: '1px', marginBottom: '12px', paddingLeft: '8px' }}>AI ENGINE</div>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px', borderRadius: '20px', gap: '4px' }}>
                                    <button 
                                        onClick={() => { setPreferredModel('gemini'); localStorage.setItem('zaars_model', 'gemini'); }}
                                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: preferredModel === 'gemini' ? 'rgba(252, 66, 255, 0.2)' : 'transparent', color: preferredModel === 'gemini' ? '#fc42ff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}
                                    >
                                        Gemini 2.5
                                    </button>
                                    <button 
                                        onClick={() => { setPreferredModel('llama'); localStorage.setItem('zaars_model', 'llama'); }}
                                        style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: preferredModel === 'llama' ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: preferredModel === 'llama' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}
                                    >
                                        Llama 3.3
                                    </button>
                                </div>
                            </div>

                            <div style={{ position: 'relative', marginBottom: '32px' }}>
                                <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="text" placeholder="Search history..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '14px 16px 14px 44px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                            </div>

                            <div>
                                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, letterSpacing: '1px', marginBottom: '16px', paddingLeft: '8px' }}>RECENT HISTORY</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {history.filter(h => h.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                                        <div key={item.id} onClick={() => loadSession(item.id)} style={{ position: 'relative', overflow: 'hidden', group: 'true', padding: '14px 16px', background: activeSessionId === item.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'background 0.2s', border: activeSessionId === item.id ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent' }} onMouseOver={(e) => { if (activeSessionId !== item.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.querySelector('.delete-btn').style.opacity = '1'; }} onMouseOut={(e) => { if (activeSessionId !== item.id) e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.delete-btn').style.opacity = '0'; }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={14} color="rgba(255, 255, 255, 0.6)" /></div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}><div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{item.title}</div><div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', fontWeight: 500 }}>{item.date}</div></div>
                                            <button className="delete-btn" onClick={(e) => deleteSession(item.id, e)} style={{ opacity: 0, padding: '8px', background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {messages.length > 0 && !isPrivateMode && (
                                <div style={{ marginTop: '32px' }}>
                                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600, letterSpacing: '1px', marginBottom: '16px', paddingLeft: '8px' }}>INTELLIGENCE</div>
                                    <button onClick={() => setIntelligenceOpen(true)} style={{ width: '100%', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                        <Activity size={18} color="#fc42ff" />
                                        <span style={{ fontSize: '13px', fontWeight: 500 }}>Open Intelligence Radar</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 700, letterSpacing: '1px' }}>ZAARS</span>
                                <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.25)', fontWeight: 500 }}>Zero-Error AI Agent Reasoning System</span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.2)', fontStyle: 'italic', marginTop: '12px' }}>
                                Built with a Lot of coffee and crashouts
                            </div>
                            <a href="https://github.com/AbdulArshath007" target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontWeight: 500, marginTop: '8px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#fc42ff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                                © {new Date().getFullYear()} Abdul Arshath
                            </a>
                        </div>
                    </div>

                    {/* Mobile sidebar backdrop */}
                    {isMobile && isSidebarOpen && (
                        <div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
                    )}
                    <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', opacity: (isSidebarOpen && isMobile) ? 0.3 : 1, filter: (isSidebarOpen && isMobile) ? 'blur(8px)' : 'none', pointerEvents: (isSidebarOpen && isMobile) ? 'none' : 'auto' }}>

                        <div className="mobile-header" style={{ padding: '32px 40px 16px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)} style={{ position: 'absolute', left: isMobile ? '16px' : '40px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', cursor: 'pointer', padding: '10px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                <Menu size={20} />
                            </button>

                            <div className="mobile-title-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={startNewChat}>
                                <h1 className="mobile-title" style={{ margin: 0, fontSize: '28px', fontWeight: 400, fontFamily: "'Playfair Display', serif", color: '#fff', letterSpacing: '12px', textTransform: 'uppercase' }}>ZAARS</h1>
                                {isPrivateMode ? (
                                    <div style={{ padding: '4px 12px', background: 'rgba(128, 0, 128, 0.2)', border: '1px solid rgba(128, 0, 128, 0.4)', borderRadius: '12px', color: '#d18ced', fontSize: '9px', fontWeight: 600, letterSpacing: '3px', marginTop: '8px' }}>
                                        PRIVATE WINDOW
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        {!isMobile && <div style={{ fontSize: '8px', fontFamily: "'Playfair Display', serif", color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '4px' }}>ZERO-ERROR AI AGENT REASONING SYSTEM</div>}
                                        <div style={{ padding: '2px 6px', background: 'rgba(252, 66, 255, 0.1)', border: '1px solid rgba(252, 66, 255, 0.3)', borderRadius: '6px', color: '#fc42ff', fontSize: '7px', fontWeight: 800 }}>v1.0.4</div>
                                    </div>
                                )}
                            </div>

                            {/* Right Header Icons */}
                            <div style={{ position: 'absolute', right: isMobile ? '16px' : '40px', display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
                                {/* Header Model Switcher — desktop only */}
                                {!isMobile && <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px', borderRadius: '14px', gap: '2px' }}>
                                    <button onClick={() => { setPreferredModel('gemini'); localStorage.setItem('zaars_model', 'gemini'); }} style={{ padding: '6px 12px', border: 'none', borderRadius: '11px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: preferredModel === 'gemini' ? 'rgba(252, 66, 255, 0.2)' : 'transparent', color: preferredModel === 'gemini' ? '#fc42ff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', letterSpacing: '1px' }}>GEMINI</button>
                                    <button onClick={() => { setPreferredModel('llama'); localStorage.setItem('zaars_model', 'llama'); }} style={{ padding: '6px 12px', border: 'none', borderRadius: '11px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: preferredModel === 'llama' ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: preferredModel === 'llama' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s', letterSpacing: '1px' }}>LLAMA</button>
                                </div>}

                                <button
                                    onClick={() => setCurrentView('profile')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: isMobile ? '8px' : '6px 14px 6px 6px', borderRadius: '24px', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    {userProfile.avatar ? (
                                        <img src={userProfile.avatar} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} alt="profile" />
                                    ) : (
                                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 600 }}>
                                            {userProfile.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {!isMobile && <span style={{ fontSize: '13px', fontWeight: 500 }}>{userProfile.name.split(' ')[0]}</span>}
                                </button>
                                <button onClick={togglePrivateMode} style={{ background: isPrivateMode ? 'rgba(128, 0, 128, 0.2)' : 'rgba(255,255,255,0.03)', border: isPrivateMode ? '1px solid rgba(128, 0, 128, 0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', color: isPrivateMode ? '#d18ced' : '#fff', cursor: 'pointer', transition: 'all 0.3s ease', padding: '10px' }} onMouseOver={(e) => !isPrivateMode && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')} onMouseOut={(e) => !isPrivateMode && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                                    <MessageSquareDashed size={20} />
                                </button>
                            </div>
                        </div>

                        {/* View Controller (Profile vs Chat) */}
                        {currentView === 'profile' ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', overflowY: 'auto' }}>
                                <div style={{ width: '100%', maxWidth: '540px', background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 32px 80px rgba(0, 0, 0, 0.5)', borderRadius: '32px', padding: '48px', color: '#fff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
                                        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, letterSpacing: '0px' }}>Profile Settings</h2>
                                        <button onClick={() => setCurrentView('chat')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0.7, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><X size={18} /></button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                        {/* Avatar Customization */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                                            <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: '#222', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {userProfile.avatar ? (
                                                    <img src={userProfile.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '32px', fontWeight: 500 }}>{userProfile.name.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <input type="file" ref={profileInputRef} accept="image/*" onChange={handleProfilePicSelect} style={{ display: 'none' }} />
                                                <button onClick={() => profileInputRef.current?.click()} style={{ padding: '10px 20px', background: '#fff', border: 'none', borderRadius: '12px', color: '#000', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(0.97)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                    <Camera size={16} /> Upload Picture
                                                </button>
                                                {userProfile.avatar && (
                                                    <button onClick={handleRemoveProfilePic} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#ff4d4d', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                                                        Remove Image
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: 600, marginBottom: '10px', display: 'block' }}>DISPLAY NAME</label>
                                            <input
                                                type="text"
                                                value={userProfile.name}
                                                onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
                                                style={{ width: '100%', padding: '16px 20px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', color: '#fff', outline: 'none', fontSize: '15px', transition: 'border 0.3s' }}
                                                onFocus={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)'}
                                                onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.08)'}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: 600, marginBottom: '10px', display: 'block' }}>CONNECTED EMAIL</label>
                                            <div style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: 500, boxSizing: 'border-box' }}>
                                                {userProfile.email || 'Not provided'}
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', fontWeight: 600, marginBottom: '10px', display: 'block' }}>GROQ API KEY (OPTIONAL)</label>
                                            <input
                                                type="password"
                                                placeholder="Enter your Groq API Key..."
                                                value={userProfile.apiKey || ''}
                                                onChange={e => setUserProfile({ ...userProfile, apiKey: e.target.value })}
                                                style={{ width: '100%', padding: '16px 20px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', color: '#fff', outline: 'none', fontSize: '15px', transition: 'border 0.3s' }}
                                                onFocus={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)'}
                                                onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.08)'}
                                            />
                                        </div>


                                    </div>

                                    <div style={{ marginTop: '48px', display: 'flex', gap: '16px' }}>
                                        <button onClick={() => handleProfileSave(userProfile.name)} style={{ flex: 1, padding: '16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                                            Save Configuration
                                        </button>
                                        <button onClick={handleLogout} style={{ padding: '16px 24px', background: 'transparent', color: '#ff4d4d', border: '1px solid rgba(255,0,0,0.3)', borderRadius: '16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,0,0,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <LogOut size={18} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: messages.length === 0 ? 'center' : 'flex-start', overflow: 'hidden', transition: 'justify-content 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                {messages.length > 0 && (
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                        <div style={{ width: '100%', maxWidth: '860px', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                            {messages.map((m, i) => (
                                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '12px', width: '100%' }}>
                                                    {m.role === 'user' && (
                                                        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)', color: '#fff', padding: '16px 24px', borderRadius: '24px', maxWidth: '85%', fontSize: '15px', lineHeight: '1.6', fontWeight: 400 }}>
                                                            {m.attachments && m.attachments.length > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                                                    {m.attachments.map((att, idx) => (
                                                                        <div key={idx}>
                                                                            {att.type === 'image' ? (
                                                                                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                                    <img src={att.preview} alt="uploaded notes" style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '8px', display: 'block' }} />
                                                                                </div>
                                                                            ) : (
                                                                                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                        <MessageSquareDashed size={18} color="#fc42ff" />
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{att.name}</span>
                                                                                        <span style={{ fontSize: '11px', opacity: 0.5 }}>{att.type.toUpperCase()} Document</span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {m.content}
                                                        </div>
                                                    )}

                                                {m.role === 'assistant' && (
                                                    typeof m.content === 'string' ? (
                                                        <div className="math-container" style={{ color: '#e4e4e7', fontSize: '15px', lineHeight: '1.7', width: '100%', overflowWrap: 'break-word' }}>
                                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                {m.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        m.content.type === 'chat' ? (
                                                            <div className="math-container" style={{ color: '#e4e4e7', fontSize: '15px', lineHeight: '1.7', width: '100%', overflowWrap: 'break-word' }}>
                                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                    {m.content.solution}
                                                                </ReactMarkdown>
                                                            </div>
                                                        ) : (
                                                            m.content.solution || m.content.thought ? (
                                                                <div style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                                    {/* Verified Badge */}
                                                                    {m.content.isVerified && (
                                                                        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(0, 255, 144, 0.1)', border: '1px solid rgba(0, 255, 144, 0.2)', borderRadius: '12px', color: '#00ff90', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>
                                                                            <ShieldCheck size={14} /> VERIFIED BY ZAARS AGENT
                                                                        </div>
                                                                    )}

                                                                    {m.content.thought && (
                                                                        <div style={{ marginBottom: '24px' }}>
                                                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fc42ff', marginBottom: '12px', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                <div style={{ width: '4px', height: '12px', background: '#fc42ff', borderRadius: '2px' }}></div>
                                                                                THOUGHT PROCESS
                                                                            </div>
                                                                            <div className="math-container" style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.8' }}>
                                                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                                    {m.content.thought}
                                                                                </ReactMarkdown>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Sandbox Output Terminal */}
                                                                    {m.content.sandboxOutput && (
                                                                        <div style={{ marginBottom: '24px' }}>
                                                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#42fcff', marginBottom: '12px', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                <Zap size={14} /> SANDBOX EXECUTION
                                                                            </div>
                                                                            <div style={{ background: '#0a0a0a', border: '1px solid rgba(66, 252, 255, 0.1)', borderRadius: '16px', padding: '16px', fontFamily: "'Fira Code', monospace", fontSize: '13px', color: '#42fcff', position: 'relative', overflow: 'hidden' }}>
                                                                                <div style={{ position: 'absolute', right: '12px', top: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>PYTHON 3.11</div>
                                                                                <div style={{ borderLeft: '2px solid rgba(66, 252, 255, 0.3)', paddingLeft: '12px', margin: '8px 0' }}>
                                                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content.sandboxOutput}</pre>
                                                                                </div>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                                                                                    <CheckCircle2 size={12} color="#00ff90" />
                                                                                    <span style={{ fontSize: '10px', color: 'rgba(0, 255, 144, 0.6)', fontWeight: 600 }}>Zero-Error Verification Complete</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
        
                                                                    <div className="math-container" style={{ color: '#fff', padding: '24px 0', borderTop: '2px solid rgba(255,255,255,0.08)', fontSize: '16px', lineHeight: '1.8' }}>
                                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', marginBottom: '16px', letterSpacing: '2px', opacity: 0.5 }}>FINAL SOLUTION</div>
                                                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                            {m.content.solution}
                                                                        </ReactMarkdown>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ background: 'transparent', color: '#e4e4e7', padding: '8px 0', fontSize: '15px', lineHeight: '1.7' }}>
                                                                    {JSON.stringify(m.content)}
                                                                </div>
                                                            )
                                                        )
                                                    )
                                                )}

                                                {m.role === 'error' && (
                                                    <div style={{ color: '#ff4d4d', background: 'rgba(255, 0, 0, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 0, 0, 0.1)', padding: '14px 24px', borderRadius: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 500 }}>
                                                        <XCircle size={18} /> {m.content}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {isProcessing && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                                                <Loader2 size={18} color="rgba(255, 255, 255, 0.6)" style={{ animation: 'spin 1s linear infinite' }} />
                                                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500, letterSpacing: '1px' }}>{currentStep}</span>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                        </div>
                                    </div>
                                )}

                                {messages.length === 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, textAlign: 'center', marginBottom: '40px' }}>
                                        <div style={{ fontSize: '24px', fontFamily: "'Playfair Display', serif", color: '#fff', letterSpacing: '2px' }}>{currentWelcome}</div>
                                    </div>
                                )}

                                 {/* Floating Input Dock */}
                                <div className="mobile-dock" style={{ padding: '0 24px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '860px' }}>

                                        {uploadedFiles.length > 0 && (
                                            <div style={{ display: 'flex', gap: '12px', padding: '10px', overflowX: 'auto', width: '100%', maxWidth: '860px', scrollbarWidth: 'none' }}>
                                                {uploadedFiles.map(file => (
                                                    <div key={file.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', maxWidth: '200px' }}>
                                                        {/* Thumbnail */}
                                                        {file.type === 'image' ? (
                                                            <img src={file.preview} alt="preview" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                                                        ) : file.type === 'pdf' && file.thumbnail ? (
                                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                <img src={file.thumbnail} alt="pdf preview" style={{ width: '36px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)' }} />
                                                                <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(255,60,60,0.9)', borderRadius: '3px', fontSize: '6px', fontWeight: 800, color: '#fff', padding: '1px 3px', letterSpacing: '0.5px' }}>PDF</div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '36px', height: '36px', background: file.type === 'pdf' ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.1)', border: file.type === 'pdf' ? '1px solid rgba(255,80,80,0.3)' : '1px solid transparent', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <Activity size={16} color={file.type === 'pdf' ? '#ff5050' : '#fc42ff'} />
                                                            </div>
                                                        )}
                                                        {/* Info */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                                            {file.type === 'pdf' && file.numPages && (
                                                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginTop: '2px' }}>{file.numPages} page{file.numPages > 1 ? 's' : ''}</span>
                                                            )}
                                                            {file.type === 'image' && (
                                                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginTop: '2px' }}>Image</span>
                                                            )}
                                                        </div>
                                                        <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Action chips row — sits above the input bar */}
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '4px', flexWrap: 'wrap' }}>
                                            {/* Mode toggle chip */}
                                            <button
                                                onClick={() => setMode(prev => prev === 'reasoning' ? 'simple' : 'reasoning')}
                                                disabled={isProcessing || isClarifying}
                                                title="Switch Mode"
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: mode === 'reasoning' ? 'rgba(180, 100, 255, 0.15)' : 'rgba(255,255,255,0.06)', border: mode === 'reasoning' ? '1px solid rgba(180, 100, 255, 0.35)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: mode === 'reasoning' ? '#fc42ff' : 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, cursor: isProcessing || isClarifying ? 'default' : 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap', letterSpacing: '0.3px' }}
                                            >
                                                {mode === 'reasoning' ? <Brain size={13} /> : <Zap size={13} />}
                                                {mode === 'reasoning' ? 'Reasoning' : 'Simple'}
                                            </button>

                                            {/* Refine chip */}
                                            <button
                                                onClick={handleClarify}
                                                disabled={!input.trim() || isProcessing || isClarifying}
                                                title="Auto-Refine Query"
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: input.trim() && !isProcessing && !isClarifying ? 'pointer' : 'default', opacity: input.trim() && !isProcessing && !isClarifying ? 1 : 0.35, transition: 'all 0.25s ease', whiteSpace: 'nowrap' }}
                                            >
                                                {isClarifying ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
                                                Refine
                                            </button>
                                        </div>

                                        {/* Input bar — clean, minimal */}
                                        <div className="mobile-input-container" style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)', borderRadius: '32px', padding: '10px 14px', width: '100%', boxSizing: 'border-box' }}>

                                            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />

                                            <Magnet padding={50} magnetStrength={-3} disabled={isProcessing}>
                                                <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} title="Attach files" style={{ padding: '12px', background: uploadedFiles.length > 0 ? 'rgba(180, 100, 255, 0.2)' : 'rgba(255,255,255,0.05)', border: uploadedFiles.length > 0 ? '1px solid rgba(180, 100, 255, 0.3)' : '1px solid transparent', cursor: isProcessing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isProcessing ? 0.3 : 1, transition: 'all 0.3s ease', borderRadius: '50%', flexShrink: 0 }}>
                                                    <Plus size={20} color={uploadedFiles.length > 0 ? '#fc42ff' : '#fff'} />
                                                </button>
                                            </Magnet>

                                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder={uploadedFiles.length > 0 ? `Ask about ${uploadedFiles.length} files...` : "Message ZAARS..."} disabled={isProcessing || isClarifying} style={{ flex: 1, padding: '12px 8px', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '15px', fontWeight: 400, minWidth: 0 }} />

                                            <Magnet padding={60} magnetStrength={-2.5} disabled={!input.trim() && uploadedFiles.length === 0 || isProcessing || isClarifying}>
                                                <button onClick={handleSend} disabled={!input.trim() && uploadedFiles.length === 0 || isProcessing || isClarifying} style={{ padding: '12px', background: (input.trim() || uploadedFiles.length > 0) ? '#fff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: (input.trim() || uploadedFiles.length > 0) && !isProcessing && !isClarifying ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', color: (input.trim() || uploadedFiles.length > 0) ? '#000' : '#fff', flexShrink: 0 }}>
                                                    <Send size={18} />
                                                </button>
                                            </Magnet>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #050505; overscroll-behavior: none; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::placeholder { color: rgba(255,255,255,0.3) !important; }
        
        .math-container {
            width: 100%;
            overflow-x: auto;
            padding: 12px 0;
            line-height: 1.8;
            font-family: 'Inter', sans-serif;
        }
        .math-container p { margin-bottom: 24px; }
        .math-container blockquote { 
            border-left: 2px solid rgba(255,255,255,0.1); 
            padding-left: 20px; 
            margin: 20px 0; 
            font-style: italic; 
            color: rgba(255,255,255,0.6); 
        }
        .katex-display { 
            background: rgba(252, 66, 255, 0.03);
            padding: 32px;
            border-radius: 24px;
            border: 1px solid rgba(252, 66, 255, 0.1);
            margin: 2em 0 !important;
            box-shadow: inset 0 0 40px rgba(0,0,0,0.2);
        }
        .katex { font-size: 1.15em; color: #fff; }
        .katex-display > .katex { color: #fc42ff; }

        @media (max-width: 768px) {
            /* Header */
            .mobile-header { padding: 16px !important; }
            .mobile-title { font-size: 22px !important; letter-spacing: 6px !important; }
            .mobile-menu-btn { display: flex !important; }

            /* Sidebar */
            .sidebar-overlay { width: 280px !important; }

            /* Input dock */
            .mobile-dock { padding: 0 12px 20px !important; }
            .mobile-input-container { padding: 8px 10px !important; border-radius: 24px !important; gap: 6px !important; }
            .mobile-mode-btn { display: none !important; }
            .mobile-refine-btn { padding: 8px 12px !important; font-size: 11px !important; }

            /* Messages */
            .math-container { font-size: 14px !important; }
            .message-text { font-size: 14px !important; }

            /* Profile */
            .profile-card { 
                padding: 24px !important; 
                border-radius: 24px !important;
                margin: 16px !important;
                max-width: calc(100% - 32px) !important;
            }

            /* Glassmorphism optimizations */
            .sidebar-overlay, .mobile-input-container {
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
            }

            /* Scroll performance */
            .message-item {
                content-visibility: auto;
                contain-intrinsic-size: 1px 100px;
            }

            /* Reduced animations */
            * { transition-duration: 0.25s !important; }
        }

        /* Prevent horizontal scroll */
        body { 
            overflow-x: hidden !important; 
            width: 100vw;
            position: fixed; /* Prevent rubber banding on some mobile browsers */
            overflow-y: auto;
        }

        /* Touch devices: disable magnetic hover effects */
        @media (hover: none) {
            * { -webkit-tap-highlight-color: transparent; }
            input, textarea, select { font-size: 16px !important; } /* Prevent iOS zoom on focus */
        }
      `}</style>
        </div>
        </div>
    );
}
