import React, { useState, useRef, useEffect } from 'react';
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

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


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
        if (disabled) { setPosition({ x: 0, y: 0 }); return; }
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
                setIsActive(false);
                setPosition({ x: 0, y: 0 });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [padding, disabled, magnetStrength]);

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

    // ── Authentication Logic ───────────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!authData.username || !authData.password) {
            setAuthError('Required fields missing.');
            return;
        }
        setIsAuthLoading(true); setAuthError('');
        try {
            const endpoint = isRegistering ? '/auth/register' : '/auth/login';
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: authData.username, password: authData.password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Authentication failed');

            const newProfile = { ...userProfile, name: data.user.name, originalUsername: data.user.originalUsername, email: data.user.email || '', isGoogle: data.user.isGoogle, token: data.token, avatar: data.user.avatar, apiKey: data.user.apiKey || '' };
            setUserProfile(newProfile);
            localStorage.setItem('zaars_user_profile', JSON.stringify(newProfile));
            setIsAuthenticated(true);
            syncHistory(data.token);
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setShowGoogleModal(false);
        setIsAuthLoading(true); setAuthError('');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiUrl}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Google Auth failed');
            
            const newProfile = { ...userProfile, name: data.user.name, originalUsername: data.user.originalUsername, email: data.user.email || '', isGoogle: true, token: data.token, avatar: data.user.avatar, apiKey: data.user.apiKey || '' };
            setUserProfile(newProfile);
            localStorage.setItem('zaars_user_profile', JSON.stringify(newProfile));
            setIsAuthenticated(true);
            syncHistory(data.token);
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setIsAuthLoading(false);
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
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiUrl}/user/sessions`, {
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
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiUrl}/user/sessions`, {
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
            const apiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
            const res = await fetch(`${apiUrl}/user/sessions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setHistory(prev => prev.filter(h => h.id !== id));
                if (activeSessionId === id || activeSessionId == id) {
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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

        while (retries > 0) {
            try {
                // Determine model
                const hasImage = chatHistory.some(msg => Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url'));
                const model = hasImage ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

                // Format messages
                const messages = [];
                if (systemInstruction) {
                    messages.push({ role: "system", content: systemInstruction });
                }

                chatHistory.filter(msg => msg.role !== 'error').forEach(msg => {
                    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
                });

                let response;
                if (userProvidedKey) {
                    // Direct mode: user provided their own key
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
                } else {
                    // LINKED / AUTOMATIC mode: Hit our proxy
                    response = await fetch(`${apiUrl}/api/ai/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model,
                            messages,
                            response_format: useJson ? { type: "json_object" } : { type: "text" }
                        })
                    });
                }

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    if (response.status === 429) { // Rate limit
                        retries--;
                        await new Promise(r => setTimeout(r, delay));
                        delay *= 2;
                        continue;
                    }
                    throw new Error(errData.error || `Error ${response.status}`);
                }

                const data = await response.json();
                const text = data.choices?.[0]?.message?.content;
                if (!text) throw new Error("No response from AI");

                if (useJson) {
                    try { return JSON.parse(text); } catch(e) { return { type: "chat", solution: text }; }
                }
                return text;
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
                        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(reader.result) });
                        const pdf = await loadingTask.promise;
                        let text = "";
                        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            text += content.items.map(item => item.str).join(' ') + "\n";
                        }
                        if (pdf.numPages > 10) text += "\n... (more pages)";
                        setUploadedFiles(prev => [...prev, { id: Date.now() + Math.random(), type: 'pdf', name: fileName, content: text, preview: null }]);
                    } catch (err) { console.error(err); alert(`Failed to parse PDF: ${fileName}`); }
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
            
            const apiHistory = newMessages.map((m) => {
                if (m.role !== 'user') {
                    return { role: m.role, content: typeof m.content === 'object' ? JSON.stringify(m.content) : m.content.toString() };
                }
                
                let parts = [];
                let textBonus = "";

                if (m.attachments && m.attachments.length > 0) {
                    m.attachments.forEach(att => {
                        if (att.type === 'image') {
                            parts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.base64}` } });
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

            const baseInstruction = `You are ZAARS (Zero-error AI Agent Reasoning System), a specialist Mathematical Reasoning Engine. 
CRITICAL MATH INSTRUCTION:
- For complex math, provide step-by-step logical derivation.
- Always use LaTeX formatting for mathematical expressions. 
- Use standard Markdown for text and $...$ for inline math or $$...$$ for block math.
- Avoid using raw characters if they can be represented in math mode.
- Scan ALL provided images carefully for math notes, equations, or diagrams.
- If multiple documents or images are provided, synthesize the information from all of them to solve the query.
- ADAPTABILITY: If notes/docs show a specific step-by-step method, notation style, or educational framework, ADAPT your logic to match that exact method.
- ACCURACY: Double-check every calculation. Error-free output is paramount.`;

            const modeInstruction = mode === 'reasoning' 
                ? "Your response MUST be a JSON object with strictly these keys: 'type' (set to 'reasoning'), 'thought' (your inner reasoning; if the input is a simple greeting or non-math query, keep this extremely brief or empty), 'verification' (checking your logic), and 'solution' (the final answer in LaTeX or clean text)." 
                : "Your response MUST be a JSON object with strictly these keys: 'type' (set to 'chat'), and 'solution' (the final answer in LaTeX or clean text).";

            const response = await callGroqAPI(apiHistory, `${baseInstruction} ${modeInstruction}`, true);
            if (mode === 'reasoning') { setCurrentStep('Validating adaptive logic...'); await new Promise(r => setTimeout(r, 600)); }
            const assistantMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
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
        } catch (error) { setMessages(prev => [...prev, { role: 'error', content: `Error: ${error.message}`, timestamp: new Date().toISOString() }]); } finally { setIsProcessing(false); setCurrentStep(''); }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', background: isPrivateMode ? '#050008' : '#050505', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", WebkitFontSmoothing: 'antialiased', transition: 'background 0.8s ease' }}>

            {/* ── MagicRings Background Layer ── */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, transition: 'all 0.4s ease', filter: isSidebarOpen ? 'blur(8px) saturate(0.5)' : 'none', opacity: isSidebarOpen ? 0.3 : 1 }}>
                <MagicRings color="#fc42ff" colorTwo="#42fcff" ringCount={6} speed={1} attenuation={10} lineThickness={2} baseRadius={0.35} radiusStep={0.1} scaleRate={0.1} opacity={1} blur={0} noiseAmount={0.1} rotation={0} ringGap={1.5} fadeIn={0.7} fadeOut={0.5} followMouse={true} mouseInfluence={0.2} hoverScale={1.2} parallax={0.05} clickBurst={true} />
            </div>

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
                    <div className={`sidebar-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`} style={{ position: 'absolute', top: 0, left: isSidebarOpen ? 0 : '-320px', width: '320px', height: '100vh', background: 'rgba(10, 10, 10, 0.75)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRight: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '24px 0 64px rgba(0, 0, 0, 0.5)', transition: 'left 0.5s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '32px 24px' }}>
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
                                    <button onClick={generateInsights} disabled={isGeneratingInsights} style={{ width: '100%', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: '#fff', cursor: isGeneratingInsights ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s', textAlign: 'left' }} onMouseOver={e => !isGeneratingInsights && (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')} onMouseOut={e => !isGeneratingInsights && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                                        {isGeneratingInsights ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} color="#fc42ff" />}
                                        <span style={{ fontSize: '13px', fontWeight: 500 }}>Analyze Session Patterns</span>
                                    </button>
                                    {insights && (
                                        <div style={{ position: 'relative', marginTop: '16px', padding: '16px', background: 'rgba(252, 66, 255, 0.05)', border: '1px solid rgba(252, 66, 255, 0.15)', borderRadius: '16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                                            <button onClick={() => setInsights(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0.6, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.6}>
                                                <X size={14} />
                                            </button>
                                            <div style={{ paddingRight: '12px' }}>{insights}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.3)', letterSpacing: '1px', fontWeight: 600 }}>DESIGNED & DEVELOPED BY</span>
                            <a href="https://github.com/AbdulArshath007" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#fff', textDecoration: 'none', fontWeight: 500, letterSpacing: '0.5px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#fc42ff'} onMouseOut={e => e.currentTarget.style.color = '#fff'}>
                                Abdul Arshath
                            </a>
                        </div>
                    </div>

                    <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', opacity: (isSidebarOpen && window.innerWidth <= 768) ? 0.3 : 1, filter: (isSidebarOpen && window.innerWidth <= 768) ? 'blur(8px)' : 'none', pointerEvents: (isSidebarOpen && window.innerWidth <= 768) ? 'none' : 'auto' }}>

                        <div className="mobile-header" style={{ padding: '32px 40px 16px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button className="mobile-btn" onClick={() => setIsSidebarOpen(true)} style={{ position: 'absolute', left: '40px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', cursor: 'pointer', padding: '10px', transition: 'all 0.2s', display: isSidebarOpen ? 'none' : 'flex' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                <Menu size={20} />
                            </button>

                            <div className="mobile-title-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={startNewChat}>
                                <h1 className="mobile-title" style={{ margin: 0, fontSize: '28px', fontWeight: 400, fontFamily: "'Playfair Display', serif", color: '#fff', letterSpacing: '12px', textTransform: 'uppercase' }}>ZAARS</h1>
                                {isPrivateMode ? (
                                    <div style={{ padding: '4px 12px', background: 'rgba(128, 0, 128, 0.2)', border: '1px solid rgba(128, 0, 128, 0.4)', borderRadius: '12px', color: '#d18ced', fontSize: '9px', fontWeight: 600, letterSpacing: '3px', marginTop: '8px' }}>
                                        PRIVATE WINDOW
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '8px', fontFamily: "'Playfair Display', serif", color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '4px', marginTop: '4px' }}>ZERO-ERROR AI AGENT REASONING SYSTEM</div>
                                )}
                            </div>

                            {/* Right Header Icons */}
                            <div className="mobile-hide" style={{ position: 'absolute', right: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>

                                <button
                                    onClick={() => setCurrentView('profile')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 14px 6px 6px', borderRadius: '24px', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    {userProfile.avatar ? (
                                        <img src={userProfile.avatar} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt="profile" />
                                    ) : (
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 600 }}>
                                            {userProfile.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{userProfile.name.split(' ')[0]}</span>
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
                                                                    {m.content.thought && (
                                                                        <div style={{ paddingLeft: '20px', borderLeft: '2px solid rgba(255, 255, 255, 0.15)' }}>
                                                                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', letterSpacing: '1px' }}>REASONING</div>
                                                                            <div className="math-container" style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.7' }}>
                                                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                                    {m.content.thought}
                                                                                </ReactMarkdown>
                                                                            </div>
                                                                        </div>
                                                                    )}
        
                                                                    {m.content.verification && (
                                                                        <div style={{ paddingLeft: '20px', borderLeft: '2px solid rgba(255, 255, 255, 0.15)' }}>
                                                                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', letterSpacing: '1px' }}>METHOD VERIFICATION</div>
                                                                            <div className="math-container" style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.7' }}>
                                                                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                                                    {m.content.verification}
                                                                                </ReactMarkdown>
                                                                            </div>
                                                                        </div>
                                                                    )}
        
                                                                    <div className="math-container" style={{ color: '#e4e4e7', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '15px', lineHeight: '1.7', marginTop: '8px' }}>
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
                                                    <div key={file.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
                                                        {file.type === 'image' ? (
                                                            <img src={file.preview} alt="preview" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '8px' }} />
                                                        ) : (
                                                            <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Activity size={16} color="#fc42ff" />
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '120px' }}>
                                                            <span style={{ color: '#fff', fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                                        </div>
                                                        <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mobile-input-container" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(40px) saturate(1.5)', WebkitBackdropFilter: 'blur(40px) saturate(1.5)', border: '1px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)', borderRadius: '32px', padding: '10px 14px', width: '100%', boxSizing: 'border-box' }}>

                                            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />

                                            <Magnet padding={50} magnetStrength={-3} disabled={isProcessing}>
                                                <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} title="Attach files" style={{ padding: '12px', background: uploadedFiles.length > 0 ? 'rgba(180, 100, 255, 0.2)' : 'rgba(255,255,255,0.05)', border: uploadedFiles.length > 0 ? '1px solid rgba(180, 100, 255, 0.3)' : '1px solid transparent', cursor: isProcessing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isProcessing ? 0.3 : 1, transition: 'all 0.3s ease', borderRadius: '50%' }}>
                                                    <Plus size={20} color={uploadedFiles.length > 0 ? '#fc42ff' : '#fff'} />
                                                </button>
                                            </Magnet>

                                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder={uploadedFiles.length > 0 ? `Ask about ${uploadedFiles.length} files...` : "Message ZAARS..."} disabled={isProcessing || isClarifying} style={{ flex: 1, padding: '12px 16px', background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '15px', fontWeight: 400 }} />

                                            <Magnet padding={60} magnetStrength={-3} disabled={isProcessing || isClarifying}>
                                                <button className="mobile-mode-btn" onClick={() => setMode(prev => prev === 'reasoning' ? 'simple' : 'reasoning')} disabled={isProcessing || isClarifying} title={`Switch Mode`} style={{ padding: '12px 20px', background: mode === 'reasoning' ? 'rgba(180, 100, 255, 0.15)' : 'transparent', border: mode === 'reasoning' ? '1px solid rgba(180, 100, 255, 0.3)' : '1px solid transparent', borderRadius: '24px', color: mode === 'reasoning' ? '#fc42ff' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: isProcessing || isClarifying ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>
                                                    {mode === 'reasoning' ? <Brain size={16} /> : <Zap size={16} />}
                                                    {mode === 'reasoning' ? 'Reasoning' : 'Simple'}
                                                </button>
                                            </Magnet>

                                            <Magnet padding={60} magnetStrength={-3} disabled={!input.trim() || isProcessing || isClarifying}>
                                                <button className="mobile-refine-btn" onClick={handleClarify} disabled={!input.trim() || isProcessing || isClarifying} title="Auto-Refine Query" style={{ padding: '12px 20px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: input.trim() && !isProcessing && !isClarifying ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '8px', opacity: input.trim() && !isProcessing && !isClarifying ? 1 : 0.3, transition: 'all 0.3s ease', whiteSpace: 'nowrap' }}>
                                                    {isClarifying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                                                    <span className="mobile-hide">Refine</span>
                                                </button>
                                            </Magnet>


                                            <Magnet padding={60} magnetStrength={-2.5} disabled={!input.trim() && uploadedFiles.length === 0 || isProcessing || isClarifying}>
                                                <button onClick={handleSend} disabled={!input.trim() && uploadedFiles.length === 0 || isProcessing || isClarifying} style={{ padding: '12px', background: (input.trim() || uploadedFiles.length > 0) ? '#fff' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: (input.trim() || uploadedFiles.length > 0) && !isProcessing && !isClarifying ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', color: (input.trim() || uploadedFiles.length > 0) ? '#000' : '#fff' }}>
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

        @media (max-width: 768px) {
            .sidebar-overlay { 
                position: fixed !important; 
                z-index: 1000 !important; 
                width: 280px !important; 
                transform: translateX(-100%);
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .sidebar-open { transform: translateX(0) !important; }
            .mobile-hide { display: none !important; }
            .mobile-header { padding: 20px 24px !important; }
            .mobile-title { font-size: 20px !important; letter-spacing: 6px !important; }
            .mobile-dock { padding: 0 16px 24px !important; }
            .mobile-input-container { padding: 8px 10px !important; border-radius: 24px !important; }
            .mobile-btn { padding: 10px !important; }
            .mobile-mode-btn { display: none !important; }
            .mobile-refine-btn { padding: 8px 14px !important; font-size: 11px !important; }
            .message-text { font-size: 14px !important; }
            .profile-card { padding: 24px !important; border-radius: 24px !important; }
        }
      `}</style>
        </div>
    );
}