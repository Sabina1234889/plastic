/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  increment,
  runTransaction,
  getDoc,
  limit
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import confetti from 'canvas-confetti';
import { ErrorBoundary } from './components/ErrorBoundary';
import Webcam from 'react-webcam';
import { 
  Recycle, 
  Wallet, 
  History, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  MoreVertical,
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp, 
  Users, 
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Leaf,
  MapPin,
  Map as MapIcon,
  BarChart3,
  Trophy,
  QrCode,
  Zap,
  ChevronRight,
  Search,
  Info,
  ArrowRight,
  ShieldCheck,
  Globe,
  Activity,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
  Mail,
  Phone,
  Camera,
  RefreshCw,
  Scan,
  Check
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

// --- Types ---

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  nid: string;
  phone: string;
  balance: number;
  totalPlastic: number;
  virtualCardNumber: string;
  createdAt: any;
  photoURL?: string;
  kycStatus: 'unverified' | 'pending' | 'verified';
  kycDocumentType?: 'nid' | 'passport' | 'license';
}

interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  plasticWeight?: number;
  method?: 'bkash' | 'nagad';
  status: 'completed' | 'pending';
  timestamp: any;
}

interface GlobalStats {
  totalUsers: number;
  totalPlastic: number;
  totalMoney: number;
}

interface Machine {
  id: string;
  name: string;
  location: string;
  totalCollected: number;
  todayCollected: number;
  status: 'online' | 'offline' | 'full';
  lat: number;
  lng: number;
}

// --- Constants ---
const RATE_PER_KG = 25;

// --- Components ---

const ExchangeRateTicker = () => {
  const rates = [
    { label: 'PET Clear', price: '৳25/kg', trend: 'up' },
    { label: 'HDPE Plastic', price: '৳35/kg', trend: 'up' },
    { label: 'LDPE Soft', price: '৳18/kg', trend: 'stable' },
    { label: 'Mixed Plastic', price: '৳12/kg', trend: 'down' },
    { label: 'Aluminum Cans', price: '৳85/kg', trend: 'up' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500/10 backdrop-blur-md border-b border-emerald-500/20 h-8 overflow-hidden flex items-center">
      <div className="flex whitespace-nowrap animate-marquee">
        {[...rates, ...rates, ...rates].map((rate, i) => (
          <div key={i} className="flex items-center gap-4 px-8 border-r border-white/5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{rate.label}</span>
            <span className="text-[10px] font-black text-white">{rate.price}</span>
            {rate.trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            ) : rate.trend === 'down' ? (
              <ArrowDownRight className="w-3 h-3 text-red-500" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const GlowingParticles = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {[...Array(30)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ 
          x: Math.random() * 100 + "%", 
          y: Math.random() * 100 + "%", 
          opacity: Math.random() * 0.5,
          scale: Math.random() * 0.5 + 0.5
        }}
        animate={{ 
          y: [null, (Math.random() - 0.5) * 200 + "px"],
          opacity: [null, Math.random() * 0.5, 0]
        }}
        transition={{ 
          duration: Math.random() * 10 + 10, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute w-1 h-1 bg-emerald-500/30 rounded-full blur-[1px]"
      />
    ))}
  </div>
);

const MilestoneTracker = ({ currentKg }: { currentKg: number }) => {
  const targetKg = 20; // 500 BDT / 25 BDT/kg
  const progress = Math.min((currentKg / targetKg) * 100, 100);
  const remaining = Math.max(targetKg - currentKg, 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Milestone</p>
        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{progress.toFixed(0)}%</p>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
        />
      </div>
      <p className="text-[9px] font-bold text-slate-500 italic">
        {remaining > 0 ? `${remaining.toFixed(1)}kg more to reach ৳500 threshold` : "Threshold reached! Ready for withdrawal."}
      </p>
    </div>
  );
};

const CountUp = ({ value, duration = 2 }: { value: number, duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;

    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalFrames = Math.round(60 * duration);
    const step = end / totalFrames;
    let currentFrame = 0;

    const timer = setInterval(() => {
      currentFrame++;
      const nextValue = Math.min(Math.round(step * currentFrame), end);
      setCount(nextValue);

      if (currentFrame >= totalFrames) {
        setCount(end);
        clearInterval(timer);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [hasAnimated, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

const Confetti = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            top: "-10%", 
            left: `${Math.random() * 100}%`,
            rotate: 0,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            top: "110%", 
            left: `${Math.random() * 100}%`,
            rotate: 360 * 2,
          }}
          transition={{ 
            duration: Math.random() * 2 + 2, 
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2
          }}
          className="absolute w-2 h-2 bg-emerald-500 rounded-sm opacity-60"
        />
      ))}
    </div>
  );
};

const CyberEcoBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-500/5 blur-[100px]" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
  </div>
);


const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
    whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
    className={`glass rounded-[2.5rem] p-8 transition-shadow duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

const Button = ({ 
  children, 
  onClick, 
  className = "", 
  variant = "primary",
  disabled = false,
  icon: Icon
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  className?: string, 
  variant?: "primary" | "glass" | "outline",
  disabled?: boolean,
  icon?: any
}) => {
  const variants = {
    primary: "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400",
    glass: "glass text-white hover:bg-white/10",
    outline: "border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </motion.button>
  );
};

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

const VirtualCard = ({ profile, isGuest = false }: { profile: UserProfile | null, isGuest?: boolean }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      className="perspective-1000 py-8"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full max-w-[400px] aspect-[1.6/1] mx-auto group cursor-pointer"
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 -z-10 bg-emerald-500/20 rounded-[2rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute inset-0 bg-[#020617] backdrop-blur-xl rounded-[2rem] overflow-hidden border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
          {/* Holographic Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-emerald-500/5 pointer-events-none" />
          
          <div className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Eco-Pass Digital</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    NFC Active
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <Recycle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Card Holder</p>
                <h3 className="text-sm font-black text-white tracking-widest uppercase">
                  {isGuest ? 'Guest Explorer' : profile?.name || 'Loading...'}
                </h3>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">plasticX ID</p>
                  <p className="text-[10px] font-mono text-emerald-500/80 tracking-[0.2em]">
                    {isGuest ? 'PX-GUEST-000' : `PX-${profile?.uid.slice(0, 8).toUpperCase() || 'XXXX'}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-8 h-5 bg-white/5 rounded border border-white/10 flex items-center justify-center">
                      <div className="w-4 h-3 bg-emerald-500/20 rounded-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
};

const NFCScanner = ({ onComplete }: { onComplete: () => void }) => {
  const [scanning, setScanning] = useState(false);
  const [ripples, setRipples] = useState<{ id: number, x: number, y: number }[]>([]);

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 1000);
  };

  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      onComplete();
    }, 2500);
  };

  const handleScanClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e);
    startScan();
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-12">
      <div className="relative">
        <AnimatePresence>
          {scanning && (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl"
              />
            </>
          )}
        </AnimatePresence>
        
        {/* Constant Ripple */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-[-20px] bg-emerald-500/10 rounded-full blur-md"
          />
        </div>

        <motion.div
          animate={scanning ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
          className={`w-32 h-32 rounded-full flex items-center justify-center border-4 transition-colors duration-500 z-10 relative ${scanning ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20 bg-white/5'}`}
        >
          <Smartphone className={`w-12 h-12 ${scanning ? 'text-emerald-500' : 'text-white/40'}`} />
        </motion.div>
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-xl font-black text-white">
          {scanning ? 'Establishing Handshake...' : 'Ready to Sync'}
        </h3>
        <p className="text-sm text-slate-400 max-w-[200px] mx-auto">
          {scanning ? 'Hold your device near the machine sensor' : 'Tap the button below to simulate NFC connection'}
        </p>
      </div>

      <button
        onClick={handleScanClick}
        disabled={scanning}
        className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.4)] relative overflow-hidden group"
      >
        <span className="relative z-10">{scanning ? 'Scanning...' : 'Tap to Scan'}</span>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 1 }}
            style={{ left: ripple.x, top: ripple.y }}
            className="absolute w-10 h-10 bg-white/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          />
        ))}
        <motion.div 
          className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"
        />
      </button>
    </div>
  );
};

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("Establishing Secure Connection...");

  useEffect(() => {
    const startTime = Date.now();
    const duration = 3500; // 3.5 seconds for progress bar

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);

      if (elapsed >= 0 && elapsed < 1000) setText("Establishing Secure Connection...");
      else if (elapsed >= 1000 && elapsed < 2000) setText("Scanning Plastic Exchange Units...");
      else if (elapsed >= 2000 && elapsed < 3000) setText("Initializing Virtual Card ID...");
      else if (elapsed >= 3000) setText("Welcome to the Future of Recycling.");

      if (elapsed >= 3500) {
        clearInterval(timer);
        onComplete();
      }
    }, 16);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] bg-[#020617] flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Background Aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />

      <div className="relative z-10 flex flex-col items-center gap-12">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 4, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
        >
          <Recycle className="w-12 h-12 text-emerald-500" />
        </motion.div>

        <div className="space-y-6 w-64">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            />
          </div>
          
          <AnimatePresence mode="wait">
            <motion.p
              key={text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] text-center"
            >
              {text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

function AuthModal({ onLogin, onGuest, onClose }: { onLogin: (type: 'google' | 'phone', data?: any) => void, onGuest: () => void, onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nid, setNid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return toast.error('Please fill all fields');
    if (!isLogin && (!name || !nid || !email)) return toast.error('Please fill all fields');
    
    setSubmitting(true);
    try {
      await onLogin('phone', { phone, email, password, name, nid, isLogin });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass p-8 rounded-[2.5rem] border border-white/10 space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <Plus className="w-5 h-5 rotate-45" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <ShieldCheck className="text-emerald-500 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            {isLogin ? 'Welcome Back' : 'Create Identity'}
          </h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">
            {isLogin ? 'Access your futuristic eco-wallet' : 'Join the sustainable revolution'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 overflow-hidden"
            >
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-400 ml-4">Full Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-400 ml-4">Email Address</label>
                <input 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-400 ml-4">National ID (NID)</label>
                <input 
                  type="text"
                  value={nid}
                  onChange={e => setNid(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  placeholder="1234567890"
                />
              </div>
            </motion.div>
          )}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-emerald-400 ml-4">Phone Number</label>
            <input 
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="+880 1XXX XXXXXX"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-emerald-400 ml-4">Password</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {submitting ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">OR</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          <button 
            onClick={() => onLogin('google')}
            className="w-full py-4 glass text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 border border-white/5"
          >
            <Globe className="w-5 h-5 text-emerald-500" />
            Continue with Google
          </button>

          <button 
            onClick={onGuest}
            className="w-full py-2 text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors"
          >
            Continue as Guest
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-400 font-black hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showNFC, setShowNFC] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u && !isGuestMode) {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [isGuestMode]);

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setProfile(doc.data() as UserProfile);
        }
        setLoading(false);
      }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));
      return unsubscribe;
    }
  }, [user]);

  useEffect(() => {
    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'global'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as GlobalStats);
      }
    });

    const unsubscribeMachines = onSnapshot(collection(db, 'machines'), (snapshot) => {
      const m = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Machine));
      if (m.length === 0 && user) {
        // Seed machines if empty (only if logged in to avoid permission errors)
        const initialMachines = [
          { name: 'Eco-Station Alpha', location: 'Dhanmondi Lake', totalCollected: 1240, todayCollected: 45, status: 'online', lat: 23.7461, lng: 90.3742 },
          { name: 'Green-Point Beta', location: 'Gulshan Circle 1', totalCollected: 890, todayCollected: 32, status: 'online', lat: 23.7796, lng: 90.4127 },
          { name: 'Pure-Cycle Gamma', location: 'Banani Road 11', totalCollected: 2100, todayCollected: 68, status: 'online', lat: 23.7937, lng: 90.4066 },
          { name: 'Eco-Hub Delta', location: 'Uttara Sector 7', totalCollected: 560, todayCollected: 12, status: 'offline', lat: 23.8759, lng: 90.3907 },
        ];
        initialMachines.forEach(machine => addDoc(collection(db, 'machines'), machine));
      }
      setMachines(m);
    });

    return () => {
      unsubscribeStats();
      unsubscribeMachines();
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'), limit(10));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      });
      return unsubscribe;
    }
  }, [user]);

  const handleLogin = async (type: 'google' | 'phone', data?: any) => {
    try {
      if (type === 'google') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else if (type === 'phone') {
        // Custom Phone/Password Auth Simulation
        // In a real app, we'd use Firebase Auth with Phone or Email/Password
        // For this demo, we'll use a deterministic UID based on phone
        const uid = `phone_${data.phone.replace(/\D/g, '')}`;
        
        // Mocking Firebase Auth behavior for the demo
        // We'll use setDoc to create/update the user profile directly
        const virtualCard = `4421 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
        
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!data.isLogin) {
          // Sign Up - Check if identity already exists
          if (userDoc.exists()) {
            throw new Error('This phone number is already registered. Please Sign In.');
          }
          
          await runTransaction(db, async (transaction) => {
            transaction.set(userRef, {
              uid,
              name: data.name,
              email: data.email || '',
              nid: data.nid,
              phone: data.phone,
              password: data.password,
              balance: 100, // Welcome bonus
              totalPlastic: 0,
              virtualCardNumber: virtualCard,
              photoURL: null,
              kycStatus: 'verified',
              createdAt: serverTimestamp()
            });

            transaction.set(doc(db, 'stats', 'global'), {
              totalUsers: increment(1)
            }, { merge: true });

            transaction.set(doc(db, 'leaderboard', uid), {
              name: data.name,
              totalPlastic: 0,
              photoURL: null
            });
          });
          
          toast.success('Identity Created! Welcome Bonus: ৳ 100');
        } else {
          // Sign In
          if (!userDoc.exists()) throw new Error('Identity not found');
          // Simple password check for demo
          if (userDoc.data()?.password !== data.password) {
            throw new Error('Invalid credentials');
          }
          toast.success('Welcome Back!');
        }

        // Simulate user state
        setUser({ uid, displayName: data.name || userDoc.data()?.name } as any);
      }
      setIsGuestMode(false);
      setShowAuth(false);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast.info('Login cancelled');
      } else {
        toast.error(error.message || 'Authentication failed');
        console.error(error);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsGuestMode(false);
    setProfile(null);
    setUser(null);
  };

  const enterGuestMode = () => {
    setIsGuestMode(true);
    setLoading(false);
    setShowAuth(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <CyberEcoBackground />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user && !isGuestMode) {
    return (
      <>
        <LandingPage 
          onLogin={() => setShowAuth(true)} 
          onGuest={enterGuestMode} 
          stats={stats} 
          machines={machines}
          setCurrentPage={setCurrentPage}
          currentPage={currentPage}
        />
        <AnimatePresence>
          {showAuth && (
            <AuthModal 
              onLogin={handleLogin} 
              onGuest={enterGuestMode} 
              onClose={() => setShowAuth(false)} 
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (user && !profile && !isGuestMode) {
    return <RegistrationForm user={user} onComplete={() => setLoading(true)} />;
  }

  return (
    <ErrorBoundary>
      <motion.div 
        key="main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pb-24 selection:bg-emerald-500/30"
      >
        <CyberEcoBackground />
        <Header 
          profile={profile} 
          onLogout={handleLogout} 
          isGuest={isGuestMode} 
          onLogin={() => setShowAuth(true)} 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        
        <main className="max-w-7xl mx-auto px-6 pt-32 space-y-24">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-24"
                  >
                    {/* Hero Section */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                      <div className="space-y-8">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-6"
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                              {isGuestMode ? 'Guest Mode Active' : 'Verified Member'}
                            </Badge>
                            <div className="px-4 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live Rate: 1 KG = ৳ 25.00</span>
                            </div>
                          </div>
                          <h1 className="text-5xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase">
                            RECYCLE.<br/>
                            EARN.<br/>
                            <span className="text-emerald-500">REPEAT.</span>
                          </h1>
                          <p className="text-slate-400 text-sm max-w-md leading-relaxed uppercase tracking-wide font-medium">
                            Exchange plastic waste for instant digital currency. Join the circular economy and transform waste into value.
                          </p>
                        </motion.div>

                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                          <div className="relative group">
                            <button 
                              onClick={() => {
                                if (isGuestMode) return setShowGuestModal(true);
                                setShowNFC(true);
                              }}
                              className={`w-full p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 text-center relative overflow-hidden ${
                                isGuestMode 
                                  ? 'bg-white/5 border-white/10 grayscale-[0.5] opacity-80' 
                                  : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                              }`}
                            >
                              <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-2">
                                <Zap className="text-emerald-500 w-7 h-7" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Deposit Plastic</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Start NFC Handshake</p>
                              </div>
                              {isGuestMode && (
                                <div className="absolute inset-0 bg-[#020617]/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-6">
                                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-tight">Join the Movement. Sign in to link your card and start earning digital cash.</p>
                                </div>
                              )}
                            </button>
                          </div>

                          <div className="relative group">
                            <button 
                              onClick={() => {
                                if (isGuestMode) return setShowGuestModal(true);
                                setShowWithdraw(true);
                              }}
                              className={`w-full p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 text-center relative overflow-hidden ${
                                isGuestMode 
                                  ? 'bg-white/5 border-white/10 grayscale-[0.5] opacity-80' 
                                  : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                              }`}
                            >
                              <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-2">
                                <Wallet className="text-blue-500 w-7 h-7" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Withdraw BDT</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">bKash / Nagad Transfer</p>
                              </div>
                              {isGuestMode && (
                                <div className="absolute inset-0 bg-[#020617]/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-6">
                                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-tight">Join the Movement. Sign in to link your card and start earning digital cash.</p>
                                </div>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      </div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                      >
                        <VirtualCard profile={profile} isGuest={isGuestMode} />
                      </motion.div>
                    </div>

                    {/* Stats Bento Grid */}
                    <div className="grid lg:grid-cols-3 gap-6">
                      <GlassCard className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-8">
                          <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Machine Network</h3>
                            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Real-time Collection Points</p>
                          </div>
                          <div className="flex items-center gap-2 text-emerald-400">
                            <Activity className="w-4 h-4 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Live Updates</span>
                          </div>
                        </div>
                        <MachineMap machines={machines} />
                      </GlassCard>

                      <div className="space-y-6">
                        <GlassCard className="bg-emerald-500/5 border-emerald-500/10">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                              <TrendingUp className="text-emerald-500 w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Plastic Recycled</p>
                              <p className="text-2xl font-black text-white"><CountUp value={stats?.totalPlastic || 45000} /> KG</p>
                            </div>
                          </div>
                          <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={[
                                { v: 100 }, { v: 400 }, { v: 300 }, { v: 800 }, { v: 500 }, { v: 900 }
                              ]}>
                                <defs>
                                  <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke="#10B981" fillOpacity={1} fill="url(#colorV)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </GlassCard>

                        <GlassCard>
                          <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                                <Leaf className="text-blue-500 w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Trees Saved</p>
                                <p className="text-2xl font-black text-white"><CountUp value={Math.floor((stats?.totalPlastic || 45000) / 50)} /></p>
                              </div>
                            </div>
                            
                            <div className="h-px bg-white/5" />

                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                                <Wallet className="text-amber-500 w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Community Earnings</p>
                                <p className="text-2xl font-black text-white">৳ <CountUp value={(stats?.totalPlastic || 45000) * 25} /></p>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </div>
                    </div>

                    {/* Transactions */}
                    {!isGuestMode && (
                      <GlassCard>
                        <div className="flex justify-between items-center mb-8">
                          <div className="flex items-center gap-3">
                            <History className="text-emerald-500 w-6 h-6" />
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Activity Log</h3>
                          </div>
                          <button 
                            onClick={() => setCurrentPage('history')}
                            className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            View Full History
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left border-b border-white/5">
                                <th className="pb-4 text-[10px] uppercase tracking-widest text-slate-400 font-black">Date</th>
                                <th className="pb-4 text-[10px] uppercase tracking-widest text-slate-400 font-black">Type</th>
                                <th className="pb-4 text-[10px] uppercase tracking-widest text-slate-400 font-black">Amount</th>
                                <th className="pb-4 text-[10px] uppercase tracking-widest text-slate-400 font-black">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {transactions.map((tx) => (
                                <tr key={tx.id} className="group hover:bg-white/5 transition-colors">
                                  <td className="py-4 text-xs font-bold text-slate-300">
                                    {tx.timestamp ? format(tx.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                                  </td>
                                  <td className="py-4">
                                    <div className="flex items-center gap-2">
                                      {tx.type === 'deposit' ? (
                                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                          <Plus className="w-3 h-3 text-emerald-500" />
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                          <ArrowUpRight className="w-3 h-3 text-blue-500" />
                                        </div>
                                      )}
                                      <span className="text-xs font-black text-white uppercase">{tx.type}</span>
                                    </div>
                                  </td>
                                  <td className="py-4 text-xs font-black text-white">
                                    {tx.type === 'deposit' ? `+৳${tx.amount}` : `-৳${tx.amount}`}
                                  </td>
                                  <td className="py-4">
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">
                                      {tx.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                              {transactions.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-12 text-center text-slate-500 text-xs italic">
                                    No recent transactions found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </GlassCard>
                    )}
                  </motion.div>
                )}

                {currentPage === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <ProfilePage 
                      profile={profile!} 
                    />
                  </motion.div>
                )}

                {currentPage === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <TransactionHistory transactions={transactions} />
                  </motion.div>
                )}


                {currentPage === 'about' && (
                  <motion.div
                    key="about"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <AboutSection />
                  </motion.div>
                )}

                {currentPage === 'machines' && (
                  <motion.div
                    key="machines"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <MachinesSection machines={machines} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Modals */}
            <AnimatePresence>
              {showConfetti && <Confetti />}
              {showNFC && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-md"
                  >
                    <GlassCard className="relative">
                      <button 
                        onClick={() => setShowNFC(false)}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
                      >
                        <Plus className="w-6 h-6 rotate-45" />
                      </button>
                      <NFCScanner onComplete={() => {
                        setShowNFC(false);
                        setShowDeposit(true);
                      }} />
                    </GlassCard>
                  </motion.div>
                </div>
              )}

              {showDeposit && (
                <DepositModal 
                  profile={profile!} 
                  onClose={(success) => {
                    setShowDeposit(false);
                    if (success) {
                      setShowConfetti(true);
                      setTimeout(() => setShowConfetti(false), 5000);
                    }
                  }} 
                />
              )}

              {showWithdraw && (
                <WithdrawModal 
                  profile={profile!} 
                  onClose={() => setShowWithdraw(false)} 
                />
              )}

              {showAuth && (
                <AuthModal 
                  onLogin={handleLogin} 
                  onGuest={enterGuestMode} 
                  onClose={() => setShowAuth(false)} 
                />
              )}

              {showGuestModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowGuestModal(false)}
                    className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md glass p-10 rounded-[3rem] border-emerald-500/20 text-center space-y-8"
                  >
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                      <Zap className="text-emerald-500 w-10 h-10" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Join the Movement</h3>
                      <p className="text-slate-400 text-sm leading-relaxed uppercase tracking-widest font-medium">
                        Sign in to link your card and start earning digital cash.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          setShowGuestModal(false);
                          setShowAuth(true);
                        }}
                        className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      >
                        Sign In / Register
                      </button>
                      <button 
                        onClick={() => setShowGuestModal(false)}
                        className="w-full py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Maybe Later
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <Toaster position="top-center" expand={true} richColors />
            <Footer />
          </motion.div>
    </ErrorBoundary>
  );
}

function Footer() {
  const footerLinks = {
    system: [
      { name: 'Machine Status', href: '#', desc: 'A real-time monitoring tool that shows if the recycling units are active, full, or undergoing maintenance.' },
      { name: 'How it Works', href: '#', desc: 'A step-by-step guide explaining the process—from tapping the NFC card to depositing plastic and earning rewards.' },
      { name: 'Registration', href: '#', desc: 'The entry point for new users to create an account and begin their journey.' },
      { name: 'Virtual Card Guide', href: '#', desc: 'Instructions on how to manage and use the digital Eco-Pass for seamless interaction with the machines.' },
    ],
    support: [
      { name: 'Help Center', href: '#', desc: 'A comprehensive FAQ and troubleshooting database to assist users with common account or hardware issues.' },
      { name: 'Payment Guide', href: '#', desc: 'Detailed information on how the conversion rate works and the protocol for withdrawing funds via bKash or Nagad.' },
      { name: 'Machine Locations', href: '#', desc: 'An interactive map link that guides users to the nearest plasticX collection point in their area.' },
      { name: 'Sustainability Report', href: '#', desc: 'Transparent data showing the project\'s impact, such as total plastic collected and the reduction in carbon footprint.' },
    ],
    legal: [
      { name: 'Data Privacy', href: '#', desc: 'Information on how user data is encrypted and protected against unauthorized access.' },
      { name: 'Terms of Service', href: '#', desc: 'The legal agreement between the user and the platform regarding usage rules and financial transactions.' },
      { name: 'Cookie Policy', href: '#', desc: 'Details about how the web app uses cookies to improve the user experience and maintain secure sessions.' },
    ],
  };

  return (
    <footer className="mt-24 border-t border-emerald-500/30 bg-[#020617] relative z-10 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          {/* Brand & Mission */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <Recycle className="text-emerald-500 w-7 h-7" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-white uppercase tracking-tighter leading-none">plasticX</span>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-1">Exchange System</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Our Mission</h4>
              <p className="text-slate-400 text-xs leading-relaxed tracking-wide">
                We focus on environmental sustainability by encouraging users to recycle plastic bottles and transform waste into valuable digital currency, supporting a circular economy.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Contact Support</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold tracking-wide">+880 123 456 789</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors group cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold tracking-wide">support@plasticx.eco</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Links */}
          <div className="space-y-8">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              System Links
            </h4>
            <ul className="space-y-6">
              {footerLinks.system.map((link) => (
                <li key={link.name} className="group">
                  <a href={link.href} className="block space-y-1">
                    <span className="text-xs font-black text-slate-300 group-hover:text-emerald-400 transition-colors uppercase tracking-widest">
                      {link.name}
                    </span>
                    <p className="text-[9px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                      {link.desc}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-8">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              Support
            </h4>
            <ul className="space-y-6">
              {footerLinks.support.map((link) => (
                <li key={link.name} className="group">
                  <a href={link.href} className="block space-y-1">
                    <span className="text-xs font-black text-slate-300 group-hover:text-emerald-400 transition-colors uppercase tracking-widest">
                      {link.name}
                    </span>
                    <p className="text-[9px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                      {link.desc}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-8">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              Legal
            </h4>
            <ul className="space-y-6">
              {footerLinks.legal.map((link) => (
                <li key={link.name} className="group">
                  <a href={link.href} className="block space-y-1">
                    <span className="text-xs font-black text-slate-300 group-hover:text-emerald-400 transition-colors uppercase tracking-widest">
                      {link.name}
                    </span>
                    <p className="text-[9px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                      {link.desc}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
              Copyright © 2026 plasticX System. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[9px] text-slate-600 hover:text-emerald-500 transition-colors uppercase font-black tracking-widest">Twitter</a>
              <a href="#" className="text-[9px] text-slate-600 hover:text-emerald-500 transition-colors uppercase font-black tracking-widest">LinkedIn</a>
              <a href="#" className="text-[9px] text-slate-600 hover:text-emerald-500 transition-colors uppercase font-black tracking-widest">Instagram</a>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">System Status: Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TransactionHistory({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            Financial Ledger
          </Badge>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Transaction History</h2>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-2">Complete record of your recycling impact and withdrawals</p>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-white/5 bg-white/5">
                <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-slate-400 font-black">Timestamp</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-slate-400 font-black">Operation Type</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-slate-400 font-black">Details</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-slate-400 font-black text-right">Amount</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-slate-400 font-black text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white uppercase tracking-tight">
                        {tx.timestamp ? format(tx.timestamp.toDate(), 'MMM dd, yyyy') : 'Processing'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {tx.timestamp ? format(tx.timestamp.toDate(), 'HH:mm:ss') : 'Just now'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'}`}>
                        {tx.type === 'deposit' ? <Recycle className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-widest">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {tx.type === 'deposit' ? `${tx.plasticWeight}kg Plastic Recycled` : `Withdrawal via ${tx.method || 'Bank'}`}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={`text-sm font-black ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {tx.type === 'deposit' ? '+' : '-'}৳{tx.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] font-black uppercase tracking-widest px-3 py-1">
                      {tx.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <History className="w-12 h-12 text-slate-500" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">No transaction records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function ProfilePage({ profile }: { profile: UserProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        name,
        phone
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-[2rem] bg-[#020617] border border-emerald-500/20 flex items-center justify-center overflow-hidden shadow-2xl">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-10 h-10 text-emerald-500/40" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center border-4 border-[#020617] shadow-xl bg-emerald-500">
              <Check className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="text-center md:text-left space-y-1">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{profile.name}</h2>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile.phone}</p>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <p className="text-[10px] text-emerald-500/60 font-mono uppercase tracking-widest">PX-{profile.uid.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/5 text-slate-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Digital Pass Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Digital Identity Pass</h3>
            <VirtualCard profile={profile} />
          </div>
        </div>

        {/* User Information Section */}
        <div className="lg:col-span-3 space-y-6">
          <GlassCard className="space-y-8 border-white/5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Personal Details</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">Manage your account information</p>
              </div>
              <button 
                onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                disabled={updating}
                className="text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
              >
                {updating ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
                {isEditing ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Full Name</label>
                {isEditing ? (
                  <input 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                ) : (
                  <div className="w-full bg-[#020617]/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-bold">
                    {profile.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Email Address</label>
                <div className="w-full bg-[#020617]/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 font-bold">
                  {profile.email}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Phone Number</label>
                {isEditing ? (
                  <input 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                ) : (
                  <div className="w-full bg-[#020617]/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white font-bold">
                    {profile.phone}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">National ID</label>
                <div className="w-full bg-[#020617]/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-400 font-bold flex items-center justify-between">
                  <span>{profile.nid.replace(/.(?=.{4})/g, '*')}</span>
                  <div className="px-2 py-0.5 rounded bg-white/5 text-[7px] font-black uppercase tracking-widest text-slate-600">Locked</div>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Plastic</p>
              <p className="text-xl font-black text-white tracking-tighter">{profile.totalPlastic} KG</p>
            </div>
            <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Earned</p>
              <p className="text-xl font-black text-emerald-500 tracking-tighter">৳{(profile.totalPlastic * RATE_PER_KG).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const AboutSection = () => {
  const steps = [
    { 
      title: "Register Identity", 
      desc: "Create your secure profile using your NID for a unique virtual card.",
      icon: ShieldCheck,
      color: "emerald"
    },
    { 
      title: "Deposit Plastic", 
      desc: "Visit any Eco-Station and tap your card to deposit plastic waste.",
      icon: Zap,
      color: "blue"
    },
    { 
      title: "Earn & Withdraw", 
      desc: "Receive instant BDT and withdraw to bKash or Nagad anytime.",
      icon: Wallet,
      color: "emerald"
    }
  ];

  return (
    <div className="space-y-24 py-12">
      <div className="text-center space-y-4">
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Our Mission</Badge>
        <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter">Cleaning the Planet,<br/><span className="text-emerald-500">Rewarding the People.</span></h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">We bridge the gap between environmental responsibility and financial inclusion through a decentralized plastic collection network.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <GlassCard key={i} delay={i * 0.1} className="group">
            <div className={`w-16 h-16 rounded-[1.5rem] bg-${step.color === 'emerald' ? 'emerald' : 'blue'}-500/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
              <step.icon className={`w-8 h-8 text-${step.color === 'emerald' ? 'emerald' : 'blue'}-500`} />
            </div>
            <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">{step.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="bg-emerald-500/5 border-emerald-500/10 overflow-hidden relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Why PlasticX?</h3>
            <div className="space-y-4">
              {[
                "Instant BDT payouts to mobile wallets",
                "Real-time tracking of environmental impact",
                "Secure NID-based identity verification",
                "Wide network of automated collection nodes"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-slate-300 font-bold">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10">
             <img src="https://picsum.photos/seed/recycle/800/450" alt="Recycling" className="object-cover w-full h-full opacity-50" referrerPolicy="no-referrer" />
             <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent" />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

const MachinesSection = ({ machines }: { machines: Machine[] }) => {
  const [search, setSearch] = useState("");
  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Live Network</Badge>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase">Eco-Station Locator</h2>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by area or station name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-[2.5rem] overflow-hidden border border-white/5">
          <MachineMap machines={filteredMachines} />
        </div>
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredMachines.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-black text-white uppercase tracking-tight">{m.name}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {m.location}
                  </p>
                </div>
                <Badge className={`${m.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} text-[8px] font-black uppercase`}>
                  {m.status}
                </Badge>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  Today: <span className="text-white">{m.todayCollected}kg</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
          {filteredMachines.length === 0 && (
            <div className="text-center py-12 text-slate-500 italic text-sm">No stations found in this area.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

function Header({ 
  profile, 
  onLogout, 
  isGuest, 
  onLogin, 
  currentPage, 
  setCurrentPage 
}: { 
  profile: UserProfile | null, 
  onLogout: () => void, 
  isGuest: boolean, 
  onLogin: () => void,
  currentPage: string,
  setCurrentPage: (page: string) => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home', icon: Globe },
    { id: 'impact', label: 'Global Impact', icon: BarChart3 },
    { id: 'machines', label: 'Machine Map', icon: MapIcon },
    { id: 'about', label: 'About Us', icon: Info },
  ];

  if (profile || isGuest) {
    navLinks.push({ id: 'profile', label: 'Profile', icon: UserIcon });
  }

  const handleNavClick = (id: string) => {
    if (!profile && !isGuest) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setCurrentPage(id);
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center glass px-8 py-3 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNavClick('home')}>
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.6)] group-hover:scale-110 transition-transform border border-emerald-400/50">
            <Recycle className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-xl text-white tracking-tighter hidden sm:block uppercase">Plastic<span className="text-emerald-500">X</span></span>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative group ${
                currentPage === link.id ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-500 transition-all group-hover:w-4 ${currentPage === link.id ? 'w-4' : ''}`} />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {profile || isGuest ? (
            <div className="flex items-center gap-4 relative" ref={menuRef}>
              <div className="hidden sm:block text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                    {isGuest ? 'Guest Explorer' : profile?.name}
                  </p>
                </div>
                <p className="text-xs font-bold text-white">৳{isGuest ? '0.00' : profile?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-9 h-9 rounded-xl border transition-all flex items-center justify-center relative ${
                  isMenuOpen 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30'
                }`}
              >
                <MoreVertical className="w-5 h-5" />
                {!isMenuOpen && <div className="absolute inset-0 rounded-xl bg-emerald-500/5 animate-pulse" />}
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-4 w-56 glass border border-emerald-500/20 rounded-3xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-[#020617]/90 z-[60]"
                  >
                    <div className="p-3 space-y-1">
                      {/* Mobile Main Nav Links */}
                      <div className="md:hidden space-y-1">
                        {navLinks.filter(l => l.id !== 'profile').map((link) => (
                          <button
                            key={link.id}
                            onClick={() => handleNavClick(link.id)}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group relative overflow-hidden"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                              <link.icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-widest relative z-10">{link.label}</span>
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                          </button>
                        ))}
                        <div className="h-px bg-white/5 mx-2 my-2" />
                      </div>

                      <button
                        onClick={() => handleNavClick('profile')}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group relative overflow-hidden"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest relative z-10">Profile</span>
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                      </button>

                      <button
                        onClick={() => handleNavClick('machines')}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group relative overflow-hidden"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest text-left leading-tight relative z-10">Machine Location</span>
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                      </button>

                      <div className="h-px bg-white/5 mx-2 my-2" />

                      <button
                        onClick={() => {
                          onLogout();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-all group relative overflow-hidden"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                          <LogOut className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest relative z-10">Log Out</span>
                        <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="px-6 py-2.5 bg-transparent border-2 border-emerald-500 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] border-glow"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function MachineMap({ machines: propMachines }: { machines?: Machine[] }) {
  const defaultMachines: Machine[] = [
    { id: 'M-701', name: 'Dhanmondi Hub', location: 'Road 27, Dhaka', lat: 23.7509, lng: 90.3733, status: 'online', totalCollected: 1250, todayCollected: 45 },
    { id: 'M-702', name: 'Gulshan Plaza', location: 'Gulshan 2, Dhaka', lat: 23.7925, lng: 90.4078, status: 'online', totalCollected: 3400, todayCollected: 82 },
    { id: 'M-703', name: 'Banani Square', location: 'Banani 11, Dhaka', lat: 23.7937, lng: 90.4066, status: 'full', totalCollected: 2100, todayCollected: 120 },
    { id: 'M-704', name: 'Uttara Sector 7', location: 'Sector 7, Dhaka', lat: 23.8759, lng: 90.3795, status: 'online', totalCollected: 890, todayCollected: 30 },
  ];

  const machines = propMachines || defaultMachines;
  const [selected, setSelected] = useState<Machine | null>(null);

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Interactive Machine Map</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Find your nearest recycling unit</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Full</span>
          </div>
        </div>
      </div>

      <div className="relative aspect-[21/9] bg-[#020617] rounded-[3rem] border border-white/5 overflow-hidden group">
        {/* Simulated Map Grid */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        {/* Pulsing Markers */}
        {machines.map((m) => (
          <motion.button
            key={m.id}
            onClick={() => setSelected(m)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute group/marker"
            style={{ 
              left: `${((m.lng - 90.35) / 0.1) * 100}%`, 
              top: `${(1 - (m.lat - 23.7) / 0.2) * 100}%` 
            }}
          >
            <div className={`relative w-4 h-4 rounded-full border-2 border-white/20 ${m.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
              <motion.div 
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute inset-0 rounded-full ${m.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover/marker:opacity-100 transition-all pointer-events-none z-20">
              <div className="glass px-4 py-2 rounded-xl border-white/10 whitespace-nowrap">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">{m.name}</p>
                <p className="text-[8px] text-slate-500 uppercase tracking-widest">{m.status}</p>
              </div>
            </div>
          </motion.button>
        ))}

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-8 top-8 bottom-8 w-72 glass border-white/10 p-6 rounded-3xl z-30 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <MapPin className="text-emerald-500 w-5 h-5" />
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Machine ID: {selected.id}</p>
                  <h4 className="text-lg font-black text-white uppercase tracking-tighter">{selected.name}</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{selected.location}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Total Saved</p>
                    <p className="text-sm font-black text-white">{selected.totalCollected} KG</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Today</p>
                    <p className="text-sm font-black text-emerald-500">+{selected.todayCollected} KG</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl text-center border ${selected.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest">{selected.status === 'online' ? 'Machine Online' : 'Machine Full'}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LandingPage({ 
  onLogin, 
  onGuest, 
  stats, 
  machines,
  setCurrentPage,
  currentPage
}: { 
  onLogin: () => void, 
  onGuest: () => void, 
  stats: GlobalStats | null,
  machines: Machine[],
  setCurrentPage: (page: string) => void,
  currentPage: string
}) {
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'impact', 'machines', 'about'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setCurrentPage(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setCurrentPage]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#020617] relative overflow-x-hidden">
      <CyberEcoBackground />
      <GlowingParticles />
      <ExchangeRateTicker />

      <Header 
        profile={null} 
        onLogout={() => {}} 
        isGuest={false} 
        onLogin={onLogin} 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
      
      <main className="max-w-7xl mx-auto px-6 pt-48 pb-32 space-y-48">
        {/* Hero Section */}
        <motion.section 
          id="home"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center space-y-12"
        >
          <motion.div variants={item} className="space-y-8">
            <div className="flex flex-col items-center gap-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Verified Sustainable Tech</span>
              </div>
              
              <div className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em]">Live Rate: 1 KG = ৳ 25.00</span>
              </div>
            </div>

            <h1 className="text-6xl lg:text-9xl font-black text-white leading-[0.85] tracking-tighter uppercase">
              RECYCLE.<br/>
              EARN.<br/>
              <span className="text-emerald-500">REPEAT.</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed uppercase tracking-widest font-medium">
              The world's first futuristic plastic-to-currency exchange system. 
              Turn your environmental impact into digital assets instantly.
            </p>
          </motion.div>

          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-12 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
            >
              Start Exchanging Today
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={onGuest}
              className="w-full sm:w-auto px-12 py-5 glass text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
            >
              Explore Network
            </button>
          </motion.div>
        </motion.section>

        {/* Global Impact Dashboard */}
        <motion.section 
          id="impact"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-16"
        >
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Global Impact Dashboard</h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 glass border border-emerald-500/20 rounded-xl">
              <Zap className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Rate: 1 KG = ৳ 25.00</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Total Plastic Recycled', value: stats?.totalPlastic || 45000, icon: Recycle, color: 'emerald', suffix: ' KG' },
              { label: 'Trees Saved', value: Math.floor((stats?.totalPlastic || 45000) / 50), icon: Leaf, color: 'blue', suffix: '+' },
              { label: 'Community Earnings', value: (stats?.totalPlastic || 45000) * 25, icon: Wallet, color: 'emerald', prefix: '৳' }
            ].map((stat, i) => (
              <GlassCard key={i} className="p-10 space-y-6 group hover:border-emerald-500/30 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
                <div className={`w-14 h-14 bg-${stat.color}-500/10 rounded-2xl flex items-center justify-center border border-${stat.color}-500/20 group-hover:scale-110 transition-transform relative z-10`}>
                  <stat.icon className={`w-7 h-7 text-${stat.color}-500`} />
                </div>
                <div className="space-y-2 relative z-10">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{stat.label}</p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {stat.prefix}<CountUp value={stat.value} />{stat.suffix}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        {/* Machine Map Preview */}
        <motion.section 
          id="machines"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-12"
        >
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Machine Ecosystem</h2>
            <p className="text-slate-500 text-xs uppercase tracking-widest">Locate your nearest high-tech exchange point</p>
          </div>
          <div className="h-[600px] rounded-[3rem] overflow-hidden border border-white/5 relative bg-slate-950">
            <MachineMap machines={machines} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent pointer-events-none" />
          </div>
        </motion.section>

        {/* About Us Section */}
        <motion.section 
          id="about"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-16"
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <Info className="text-emerald-500 w-8 h-8" />
              </div>
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight">
                The Future of<br/>
                <span className="text-emerald-500">Circular Economy</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed uppercase tracking-widest font-medium">
                PlasticX is more than just a recycling project. We are building a decentralized network of high-tech exchange units that transform environmental responsibility into tangible digital assets. Our mission is to eliminate plastic waste by making recycling as easy and rewarding as a bank transaction.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { title: 'Smart Collection', desc: 'AI-powered weighing and sorting systems.' },
                  { title: 'Instant Rewards', desc: 'Digital cash sent directly to your mobile wallet.' },
                  { title: 'Global Impact', desc: 'Real-time tracking of your environmental footprint.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div>
                      <span className="text-xs font-black text-white uppercase tracking-widest">{item.title}</span>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
              <GlassCard className="p-8 aspect-square flex items-center justify-center relative z-10">
                <div className="text-center space-y-6">
                  <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                    <Recycle className="w-16 h-16 text-white animate-spin-slow" />
                  </div>
                  <p className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em]">Join 1,200+ Eco-Warriors</p>
                </div>
              </GlassCard>
            </div>
          </div>
        </motion.section>

        {/* Previews */}
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Withdrawal Preview */}
          <motion.section 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Instant Payouts</h2>
              <p className="text-slate-500 text-xs uppercase tracking-widest">Withdraw your earnings via trusted partners</p>
            </div>
            
            <div className="relative group">
              <GlassCard className="p-10 space-y-10 blur-[4px] opacity-30 pointer-events-none">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl border border-white/5 bg-white/5 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-2xl" />
                    <div className="h-3 w-16 bg-white/10 rounded" />
                  </div>
                  <div className="p-6 rounded-3xl border border-white/5 bg-white/5 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-2xl" />
                    <div className="h-3 w-16 bg-white/10 rounded" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="h-14 w-full bg-white/5 rounded-2xl" />
                  <div className="h-14 w-full bg-white/5 rounded-2xl" />
                </div>
                <div className="h-16 w-full bg-emerald-500/20 rounded-2xl" />
              </GlassCard>
              
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="glass p-10 rounded-[2.5rem] border-white/10 text-center space-y-8 max-sm shadow-2xl backdrop-blur-2xl">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/20">
                    <ShieldCheck className="text-emerald-500 w-8 h-8" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xl font-black text-white uppercase tracking-tighter">Unlock Withdrawals</p>
                    <p className="text-[11px] text-slate-400 uppercase tracking-widest leading-relaxed">Login and complete KYC to unlock instant withdrawals to bKash & Nagad.</p>
                  </div>
                  <div className="flex justify-center gap-6">
                    <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center border border-pink-500/20">
                      <span className="text-[10px] font-black text-pink-500">bK</span>
                    </div>
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/20">
                      <span className="text-[10px] font-black text-orange-500">N</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Min. Withdrawal: ৳ 500</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Deposit Preview */}
          <motion.section 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Smart Machine Tap</h2>
              <p className="text-slate-500 text-xs uppercase tracking-widest">Automated weighing & instant credit</p>
            </div>

            <div className="relative group">
              <GlassCard className="p-12 flex flex-col items-center justify-center space-y-10 min-h-[450px]">
                <motion.div
                  animate={{ 
                    boxShadow: ["0 0 20px rgba(16,185,129,0.2)", "0 0 50px rgba(16,185,129,0.4)", "0 0 20px rgba(16,185,129,0.2)"]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-40 h-40 bg-emerald-500/10 rounded-[3rem] border-2 border-emerald-500/30 flex items-center justify-center relative group-hover:scale-105 transition-transform cursor-help"
                >
                  <Smartphone className="w-16 h-16 text-emerald-500" />
                  <div className="absolute -inset-6 border border-emerald-500/20 rounded-[4rem] animate-ping" />
                  
                  {/* Tooltip */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-2xl border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-2xl">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Connect to a machine at our locations to start earning</p>
                  </div>
                </motion.div>

                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">TAB NFC</h3>
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest max-w-[250px] mx-auto leading-relaxed">
                    Simply tap your phone at any PlasticX machine for automated weighing and instant wallet credit.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                </div>
              </GlassCard>
            </div>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function RegistrationForm({ user, onComplete }: { user: FirebaseUser, onComplete: () => void }) {
  const [name, setName] = useState(user.displayName || '');
  const [phone, setPhone] = useState('');
  const [nid, setNid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !nid) return toast.error('Please fill all fields');
    
    setSubmitting(true);
    try {
      const virtualCard = `4421 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
      
      await runTransaction(db, async (transaction) => {
        transaction.set(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email: user.email || '',
          phone,
          nid,
          balance: 100, // Welcome bonus
          totalPlastic: 0,
          virtualCardNumber: virtualCard,
          photoURL: user.photoURL,
          kycStatus: 'verified',
          createdAt: serverTimestamp()
        });

        transaction.set(doc(db, 'stats', 'global'), {
          totalUsers: increment(1)
        }, { merge: true });

        transaction.set(doc(db, 'leaderboard', user.uid), {
          name,
          totalPlastic: 0,
          photoURL: user.photoURL
        });
      });

      toast.success('Registration successful!');
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error('Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 pt-32">
      <CyberEcoBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg mb-32"
      >
        <GlassCard className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white">Account Setup</h2>
            <p className="text-slate-400 text-sm">Complete your profile to activate your Eco-Pass.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-4">Full Name</label>
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Enter your legal name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-4">Phone Number</label>
              <input 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="+880 1XXX XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-4">National ID (NID)</label>
              <input 
                value={nid}
                onChange={e => setNid(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="10 or 17 digit NID"
              />
            </div>

            <button 
              disabled={submitting}
              className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {submitting ? 'Processing...' : 'Activate Account'}
            </button>
          </form>
        </GlassCard>
      </motion.div>
      <div className="w-full mt-auto">
        <Footer />
      </div>
    </div>
  );
}

function DepositModal({ profile, onClose }: { profile: UserProfile, onClose: (success?: boolean) => void }) {
  const [weight, setWeight] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nfcConnected, setNfcConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [weighing, setWeighing] = useState(false);
  
  const bdt = (weight || 0) * RATE_PER_KG;

  const simulateNFC = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setNfcConnected(true);
      toast.success('Machine Connected', { description: 'NFC Handshake Successful' });
      
      // Auto-start weighing after handshake
      setTimeout(() => {
        setWeighing(true);
        setTimeout(() => {
          const simulatedWeight = parseFloat((Math.random() * 10 + 1).toFixed(1));
          setWeight(simulatedWeight);
          setWeighing(false);
          toast.success('Machine Processing Complete', { 
            description: `Detected ${simulatedWeight}kg of plastic.` 
          });
        }, 3000);
      }, 1000);
    }, 2500);
  };

  const handleDeposit = async () => {
    if (!weight || weight <= 0) return toast.error('No plastic detected');
    setSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        transaction.update(doc(db, 'users', profile.uid), {
          balance: increment(bdt),
          totalPlastic: increment(weight)
        });

        transaction.set(doc(db, 'stats', 'global'), {
          totalPlastic: increment(weight),
          totalMoney: increment(bdt)
        }, { merge: true });

        transaction.set(doc(db, 'leaderboard', profile.uid), {
          totalPlastic: increment(weight)
        }, { merge: true });

        addDoc(collection(db, 'transactions'), {
          userId: profile.uid,
          type: 'deposit',
          amount: bdt,
          plasticWeight: weight,
          status: 'completed',
          timestamp: serverTimestamp()
        });
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#06B6D4']
      });
      toast.success('Deposit successful!', { description: `You earned ৳${bdt} for ${weight}kg of plastic.` });
      onClose(true);
    } catch (error) {
      console.error(error);
      toast.error('Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-2xl"
      >
        <GlassCard className="relative p-0 overflow-hidden">
          <button onClick={() => onClose()} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-30">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
          
          <div className="grid md:grid-cols-2">
            {/* Module A: TAP NFC */}
            <div className="p-10 flex flex-col items-center justify-center space-y-8 bg-emerald-500/5 border-r border-white/5 min-h-[400px]">
              {!nfcConnected ? (
                <>
                  <div className="relative">
                    <AnimatePresence>
                      <motion.div 
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"
                      />
                    </AnimatePresence>
                    <button
                      onClick={simulateNFC}
                      disabled={connecting}
                      className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center gap-3 transition-all group relative z-10 ${connecting ? 'border-emerald-500 bg-emerald-500/20 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 shadow-xl'}`}
                    >
                      <Smartphone className={`w-12 h-12 ${connecting ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">TAP NFC</span>
                    </button>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-black text-white uppercase tracking-widest">Connect to Machine</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed max-w-[150px]">Hold device near the collection unit sensor</p>
                  </div>
                </>
              ) : (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center space-y-6"
                >
                  <div className="relative">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      {weighing ? <Activity className="w-12 h-12 text-emerald-500 animate-pulse" /> : <CheckCircle2 className="w-12 h-12 text-emerald-500" />}
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 border-2 border-emerald-500 rounded-full"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                      {weighing ? 'Machine Processing...' : 'Connection Active'}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                      {weighing ? 'Analyzing plastic weight' : 'Ready for plastic input'}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Module B: Account Details & Input */}
            <div className="p-10 space-y-8">
              <div className="glass p-5 rounded-3xl border border-white/10 space-y-4 bg-white/5">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Account Holder</p>
                  <p className="text-[10px] font-black text-white uppercase tracking-tight">{profile.name}</p>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Unique Card ID</p>
                  <p className="text-[10px] font-black text-emerald-500 font-mono">{profile.virtualCardNumber.split(' ').pop()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Phone Number</p>
                  <p className="text-[10px] font-black text-white">{profile.phone}</p>
                </div>
              </div>

              {nfcConnected ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 ml-4">Detected Weight</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between">
                      <span className={`text-2xl font-black ${weight ? 'text-white' : 'text-slate-600'}`}>
                        {weighing ? 'Calculating...' : weight ? `${weight.toFixed(1)}` : '0.0'}
                      </span>
                      <span className="text-slate-500 font-black text-xs uppercase tracking-widest">KG</span>
                    </div>
                  </div>

                  <div className="glass p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Value</p>
                    <p className="text-2xl font-black text-emerald-400">৳{bdt.toFixed(2)}</p>
                  </div>

                  <button 
                    onClick={handleDeposit}
                    disabled={submitting || !weight || weighing}
                    className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                  >
                    {submitting ? 'Processing...' : weighing ? 'Waiting for Machine...' : 'Confirm Deposit'}
                  </button>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    <Zap className="w-6 h-6 text-slate-600" />
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">Please connect via NFC to enable machine weighing and conversion.</p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

function WithdrawModal({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const a = parseFloat(amount) || 0;

  const handleWithdraw = async () => {
    if (a < 500) return;
    if (a > profile.balance) return;
    if (!phoneNumber || phoneNumber.length < 11) return toast.error('Invalid phone number');
    
    setSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        transaction.update(doc(db, 'users', profile.uid), {
          balance: increment(-a)
        });

        addDoc(collection(db, 'transactions'), {
          userId: profile.uid,
          type: 'withdraw',
          amount: a,
          method,
          phoneNumber,
          status: 'completed',
          timestamp: serverTimestamp()
        });
      });

      setShowSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [method === 'bkash' ? '#d12053' : '#f7941d', '#10B981']
      });
      
      setTimeout(() => {
        onClose();
      }, 3500);
    } catch (error) {
      console.error(error);
      toast.error('Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-md">
      <AnimatePresence mode="wait">
        {!showSuccess ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="w-full max-w-md"
          >
            <GlassCard className="relative space-y-8 p-8 border-white/10">
              <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
              
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <Wallet className="text-emerald-500 w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Secure Withdrawal</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Select your preferred payout method</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setMethod('bkash')}
                    className={`p-5 rounded-3xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden ${
                      method === 'bkash' 
                        ? 'bg-pink-500/10 border-pink-500 shadow-[0_0_20px_rgba(209,32,83,0.2)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      method === 'bkash' ? 'bg-[#d12053] text-white scale-110' : 'bg-white/10 text-slate-400'
                    }`}>
                      <span className="font-black text-sm">bK</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${method === 'bkash' ? 'text-pink-500' : 'text-slate-500'}`}>bKash</span>
                    {method === 'bkash' && <motion.div layoutId="active-glow" className="absolute inset-0 border-2 border-pink-500 rounded-3xl" />}
                  </button>

                  <button 
                    onClick={() => setMethod('nagad')}
                    className={`p-5 rounded-3xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden ${
                      method === 'nagad' 
                        ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(247,148,29,0.2)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      method === 'nagad' ? 'bg-[#f7941d] text-white scale-110' : 'bg-white/10 text-slate-400'
                    }`}>
                      <span className="font-black text-sm">N</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${method === 'nagad' ? 'text-orange-500' : 'text-slate-500'}`}>Nagad</span>
                    {method === 'nagad' && <motion.div layoutId="active-glow" className="absolute inset-0 border-2 border-orange-500 rounded-3xl" />}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-4">Account Number</label>
                    <div className="relative">
                      <input 
                        type="tel"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder={`Enter ${method === 'bkash' ? 'bKash' : 'Nagad'} Number`}
                      />
                      <Smartphone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Amount (BDT)</label>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Balance: ৳{profile.balance.toFixed(2)}</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="0.00"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs">BDT</span>
                    </div>
                    
                    <div className="px-4">
                      {a < 500 && a > 0 ? (
                        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Minimum withdrawal is ৳ 500
                        </p>
                      ) : a > profile.balance ? (
                        <p className="text-[8px] font-black text-red-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Insufficient Balance
                        </p>
                      ) : (
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Instant processing enabled</p>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleWithdraw}
                  disabled={submitting || a < 500 || a > profile.balance || !phoneNumber}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:grayscale shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ArrowUpRight className="w-5 h-5" />
                      Process Withdrawal
                    </>
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            <GlassCard className="p-12 space-y-8 border-emerald-500/30 bg-emerald-500/5">
              <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                <Check className="text-white w-10 h-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Request Sent!</h3>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest leading-relaxed">
                  Withdrawal request of <span className="text-emerald-400 font-black">৳ {a}</span> sent successfully!<br/>
                  Funds will arrive in your {method} account shortly.
                </p>
              </div>
              <div className="pt-4">
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 3.5 }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
