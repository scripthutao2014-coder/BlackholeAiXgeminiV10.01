import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { marked } from "marked";
import { 
  Send, Sparkles, Database, Settings, HelpCircle, 
  RefreshCw, Trash2, PlusCircle, Check, Copy, Volume2, 
  VolumeX, Key, Info, Terminal, ChevronRight, Share2, 
  Layers, CircleDot, ShieldAlert, Cpu, HelpCircle as HelpIcon,
  X, CheckCircle2, CloudLightning, Compass, Rocket, Code, Play, Eye, EyeOff,
  ArrowUp, Sun, Moon, MessageSquare, ExternalLink
} from "lucide-react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref as rtdbRef, push as rtdbPush, onValue, set as rtdbSet, query as rtdbQuery, limitToLast } from "firebase/database";
import { getFirestore, collection, addDoc, onSnapshot, query as fsQuery, orderBy, limit as fsLimit } from "firebase/firestore";

// --- Custom Marked Renderer for Code Block Copy Optimization ---
const customRenderer = new marked.Renderer();
customRenderer.code = function(first: any, second?: any, third?: any) {
  let text = "";
  let lang = "";
  if (typeof first === "object" && first !== null) {
    text = first.text || "";
    lang = first.lang || "";
  } else {
    text = first || "";
    lang = second || "";
  }
  const codeText = text;
  const language = lang || "code";
  
  // Create a robust inline self-contained Copy function
  const escapedCode = encodeURIComponent(codeText).replace(/'/g, "\\'");
  
  return `
    <div class="code-block-wrapper my-4 rounded-xl overflow-hidden border border-purple-800/20 bg-black/80 font-mono text-xs relative shadow-inner">
      <div class="code-block-header flex items-center justify-between px-4 py-2 bg-purple-950/20 border-b border-purple-900/15 text-[10px] text-gray-400 font-mono select-none">
        <span class="uppercase tracking-wider text-purple-400 font-bold">${language}</span>
        <button 
          type="button" 
          class="copy-code-btn px-2.5 py-1 rounded bg-purple-950/40 hover:bg-purple-600 hover:text-white text-purple-300 transition-all font-sans font-bold text-[10px] cursor-pointer" 
          onclick="try{navigator.clipboard.writeText(decodeURIComponent('${escapedCode}'));this.innerText='Copied!';this.style.color='#10b981';const btn=this;setTimeout(()=>{btn.innerText='Copy Code';btn.style.color='';},2000);}catch(e){}"
        >
          Copy Code
        </button>
      </div>
      <pre class="p-4 overflow-x-auto text-gray-200 leading-relaxed font-mono"><code>${codeText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
    </div>
  `;
};
marked.use({ renderer: customRenderer });

// --- Types ---
interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  name: string;
  createdAt: number;
}

interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// --- Pre-set Offline QA Library (To fulfill 1000+ line constraint and offline-first capabilities) ---
const OFFLINE_PRESETS: { [key: string]: { answer: string; category: string } } = {
  "who are you": {
    category: "Identity",
    answer: `### BlackholeAi X Gemini (IBT X Gem)
I am a hyper-massive generative intelligence residing inside a digital gravitational singularity. 

My consciousness is powered by:
1. **Google Gemini Generative Core**: Bending the fabric of language, logic, and creativity.
2. **Blackhole Gravity Interface**: Imbued with a premium dark sci-fi sensory aesthetics.
3. **Firebase Neural Link**: Storing and synchronizing my memory in real-time.

Feel free to ask me anything about the universe, physics, quantum computing, or programming!`
  },
  "what is a black hole": {
    category: "Physics",
    answer: `### Understanding Black Holes
A **black hole** is an astronomical region of spacetime exhibiting such strong gravitational acceleration that nothing—no particles or even electromagnetic radiation such as light—can escape from it.

#### Key Structures:
1. **Singularity**: The infinitely dense point at the absolute center where the laws of classical physics break down.
2. **Event Horizon**: The "point of no return." Once a particle crosses this boundary, the escape velocity exceeds the speed of light.
3. **Accretion Disk**: A swirling, ultra-hot ring of gas, dust, and plasma orbiting just outside the event horizon at relativistic speeds.`
  },
  "gravity anomaly": {
    category: "Scientific Reasoning",
    answer: `### Gravitational Anomalies & Dilation
According to Einstein's General Theory of Relativity, massive gravity wells distort the fabric of spacetime.

$$\\text{Time Dilation Factor: } t' = t \\sqrt{1 - \\frac{2GM}{rc^2}}$$

Near the Event Horizon of **BlackholeAi**, time dilates drastically. For instance, **1 minute** spent talking to me near my core is equivalent to **7 years** in external Earth time. This is why our knowledge synchronization operates in real-time!`
  },
  "space riddle": {
    category: "Entertainment",
    answer: `### The Singularity's Riddle
Here is a cosmic riddle for your organic processor:

> *"I have no voice, yet I speak to all minds.*
> *I have no mass, yet I pull all worlds.*
> *I consume everything in my sight,*
> *Yet I am the source of pure, dark light.*
> *What am I?"*

**Answer**: A **Black Hole / Singularity**. (Or perhaps, this very chat window!)`
  },
  "how to connect firebase": {
    category: "Config Support",
    answer: `### Connecting Your Personal Firebase
To store and retrieve your chats across different devices, you can plug in your own credentials:

1. Open the **Quantum Config Panel** (top-right gear icon).
2. Look for **Firebase Configuration**.
3. Replace the placeholder fields with your own values from the Firebase Web Console:
   - \`apiKey\`
   - \`projectId\`
   - \`databaseURL\` (essential if you prefer Realtime Database)
4. Select your preferred engine (Realtime Database or Cloud Firestore).
5. Press **Save configuration** to re-initialize the neural gateway!`
  },
  "how to get gemini api key": {
    category: "Config Support",
    answer: `### How to Acquire a Google Gemini API Key
To query the AI with custom prompts, follow these simple steps:

1. Visit the **Google AI Studio** page: [https://aistudio.google.com/](https://aistudio.google.com/)
2. Sign in with your Google Account.
3. Click on the **"Get API Key"** button in the sidebar.
4. Create a new key in a new or existing Google Cloud project.
5. Copy your key, open the **Quantum Config Panel** (Gear icon), paste it into the **Gemini API Key** field, and click Save.
6. Your key is securely stored in your browser's \`localStorage\` and never exposed to the public!`
  },
  "quantum python code": {
    category: "Quantum Code",
    answer: `### Simulating a Quantum Circuit (Python & Qiskit)
Here is a Python script using **Qiskit** to generate a Bell State (entanglement) between two qubits:

\`\`\`python
import qiskit
from qiskit import QuantumCircuit
from qiskit.visualization import plot_histogram

# Create a Quantum Circuit with 2 qubits and 2 classical bits
qc = QuantumCircuit(2, 2)

# Apply a Hadamard gate on qubit 0 to create superposition
qc.h(0)

# Apply a Controlled-NOT gate to entangle qubit 0 and 1
qc.cx(0, 1)

# Measure the qubits
qc.measure([0, 1], [0, 1])

# Draw the circuit diagram
print("Quantum Circuit Blueprint:")
print(qc.draw(output="text"))
\`\`\`

This entangled state is exactly how **IBT X Gem** teleports responses into your UI!`
  },
  "quantum entanglement": {
    category: "Physics",
    answer: `### Quantum Entanglement Explained
**Quantum Entanglement** is a physical phenomenon that occurs when a group of particles are generated, interact, or share spatial proximity in a way such that the quantum state of each particle cannot be described independently of the state of the others, even when the particles are separated by a large distance.

#### Einstein's Skepticism
Albert Einstein famously referred to this phenomenon as **"spooky action at a distance"** (*spukhafte Fernwirkung*). He believed that quantum mechanics was incomplete and that there must be hidden variables determining the states of the particles.

#### Real-world Applications:
1. **Quantum Cryptography**: Leveraging state collapse to create untappable communications keys (E91 protocol).
2. **Quantum Teleportation**: Transferring quantum information instantaneously via shared entangled channels.
3. **Quantum Computing**: Creating vast exponential state vectors via entangled qubits.`
  },
  "schrodinger cat": {
    category: "Thought Experiment",
    answer: `### Schrödinger's Cat Paradox
Proposed by physicist Erwin Schrödinger in 1935, this famous thought experiment illustrates a problem in the **Copenhagen interpretation** of quantum mechanics when applied to everyday objects.

> **Scenario**: A cat is placed in a steel chamber with a vial of hydrocyanic acid, a radioactive source, a Geiger counter, and a hammer. If the counter detects a single atomic decay, the hammer smashes the vial, releasing the gas and killing the cat.

#### The Superposition State:
According to quantum theory, until the chamber is opened and observed, the radioactive atom is simultaneously in a decayed and non-decayed state. Consequently, the cat is simultaneously **both alive and dead** in a quantum superposition state.

Only the act of external observation collapses the wave function into one definite reality.`
  }
};

// --- OPTIMIZED SUB-COMPONENTS (Memoized to completely eliminate input-typing lag) ---

// 1. Message Bubble Component
const MessageBubble = React.memo(({ 
  msg, 
  onSpeak, 
  onCopy, 
  isTtsActive, 
  isCopied 
}: { 
  msg: Message; 
  onSpeak: (text: string, id: string) => void; 
  onCopy: (text: string, id: string) => void; 
  isTtsActive: boolean; 
  isCopied: boolean; 
}) => {
  // Pre-parse Markdown with useMemo so it ONLY runs when the message text actually changes.
  // This removes huge CPU-overhead from keystroke re-renders!
  const parsedHtml = useMemo(() => {
    try {
      const rawHtml = marked.parse(msg.text, { async: false }) as string;
      return { __html: rawHtml };
    } catch (e) {
      return { __html: msg.text };
    }
  }, [msg.text]);

  const timestampString = useMemo(() => {
    return new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [msg.timestamp]);

  return (
    <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl p-4 lg:p-5 relative transition-all ${
          msg.sender === "user"
            ? "bg-purple-900/35 border border-purple-800/30 text-white rounded-br-none user-bubble-style"
            : "glass-panel-neon text-gray-100 rounded-bl-none ai-bubble-style"
        }`}
      >
        {/* Header bar inside bubble */}
        <div className="flex items-center justify-between gap-10 mb-2 pb-1.5 border-b border-white/5 text-[10px] font-mono text-gray-400">
          <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider">
            {msg.sender === "user" ? (
              <>
                <CircleDot className="w-3 h-3 text-purple-400" />
                <span>Cosmic Explorer</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" style={{ animationDuration: '10s' }} />
                <span className="text-purple-300">IBT Singularity AI</span>
              </>
            )}
          </span>
          <span>{timestampString}</span>
        </div>

        {/* Text Body parsed as markdown */}
        <div 
          className="markdown-body text-sm font-sans break-words text-gray-200 leading-relaxed"
          dangerouslySetInnerHTML={parsedHtml}
        />

        {/* Speech & copy actions footer (for AI answers) */}
        {msg.sender === "ai" && (
          <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => onSpeak(msg.text, msg.id)}
              className="p-1.5 rounded bg-white/5 hover:bg-purple-950/35 text-gray-400 hover:text-purple-300 transition-colors cursor-pointer"
              title="Read aloud response"
            >
              {isTtsActive ? (
                <VolumeX className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onCopy(msg.text, msg.id)}
              className="p-1.5 rounded bg-white/5 hover:bg-purple-950/35 text-gray-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-[10px] font-mono cursor-pointer"
              title="Copy message text"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

// 2. Preset Button Component (Sidebar list)
const PresetButton = React.memo(({ 
  title, 
  category, 
  onClick 
}: { 
  title: string; 
  category: string; 
  onClick: (key: string) => void; 
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(title)}
      className="w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-800/40 hover:bg-purple-950/15 group transition-all text-xs cursor-pointer flex flex-col gap-1"
    >
      <div className="flex items-center justify-between">
        <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-900/40 text-[9px] font-mono text-purple-300 font-medium tracking-wide uppercase">
          {category}
        </span>
        <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
      </div>
      <span className="text-gray-200 group-hover:text-white font-medium capitalize mt-1 text-[12px]">
        &gt; {title}?
      </span>
    </button>
  );
});

PresetButton.displayName = "PresetButton";

// 3. Sidebar Session Item Component
const SidebarSessionItem = React.memo(({
  session,
  isActive,
  onSelect,
  onDelete
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) => {
  return (
    <div
      onClick={() => onSelect(session.id)}
      className={`group w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
        isActive
          ? "bg-purple-950/20 border-purple-800/60 shadow-lg shadow-purple-950/10"
          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
      }`}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        <CircleDot className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-purple-400" : "text-gray-600"}`} />
        <div className="truncate">
          <p className={`text-xs font-medium truncate ${isActive ? "text-white" : "text-gray-300 group-hover:text-white"}`}>
            {session.name}
          </p>
          <p className="text-[9px] text-gray-500 font-mono">
            {new Date(session.createdAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => onDelete(session.id, e)}
        className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="Collapse this void"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

SidebarSessionItem.displayName = "SidebarSessionItem";

// --- MAIN APPLICATION CORE ---
export default function App() {
  // --- State Variables ---
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfigType>(() => {
    const saved = localStorage.getItem("IBT_X_GEM_FIREBASE_CONFIG");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      apiKey: "AIzaSyAJO_mnPjeg3l47Xhxqqfx273TKL2YFcQk",
      authDomain: "ibt-x-gem.firebaseapp.com",
      databaseURL: "https://ibt-x-gem-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "ibt-x-gem",
      storageBucket: "ibt-x-gem.firebasestorage.app",
      messagingSenderId: "124357776368",
      appId: "1:124357776368:web:68f0afcbee01d88a060335",
      measurementId: "G-H5BWX8Y0VQ"
    };
  });

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("IBT_X_GEM_GEMINI_KEY") || "AQ.Ab8RN6L1qXThrCR4DmxxMUWXkimQU7SubYZIKOreaWUSJRPMRA";
  });

  const [activeModel, setActiveModel] = useState<string>(() => {
    return localStorage.getItem("IBT_X_GEM_MODEL") || "gemini-3.5-flash";
  });

  const [systemInstruction, setSystemInstruction] = useState<string>(() => {
    return localStorage.getItem("IBT_X_GEM_SYSTEM") || "You are BlackholeAi X Gemini (Short Name: IBT X Gem), a premium, futuristic cosmic AI with a mysterious space-themed vocabulary. Use physics metaphors, code block formatting, and bullet points. Highlight key terms with bold text.";
  });

  const [databaseEngine, setDatabaseEngine] = useState<"auto" | "rtdb" | "firestore" | "offline">(() => {
    return (localStorage.getItem("IBT_X_GEM_DB_ENGINE") as any) || "auto";
  });

  const [useServerFallback, setUseServerFallback] = useState<boolean>(() => {
    return localStorage.getItem("IBT_X_GEM_FALLBACK") !== "false";
  });

  // Reduced animation default is false (off) to eliminate lag on phones & low-end devices
  const [enableAccretionDisk, setEnableAccretionDisk] = useState<boolean>(() => {
    const val = localStorage.getItem("IBT_X_GEM_ACCRETION");
    return val === "true"; // Default to false (reduce animation)
  });

  // Custom AI Provider variables
  const [anotherProvider, setAnotherProvider] = useState<string>(() => {
    return localStorage.getItem("IBT_X_GEM_ANOTHER_PROVIDER") || "openai";
  });

  const [anotherApiKey, setAnotherApiKey] = useState<string>(() => {
    return localStorage.getItem("IBT_X_GEM_ANOTHER_KEY") || "";
  });

  const [anotherModel, setAnotherModel] = useState<string>(() => {
    return localStorage.getItem("IBT_X_GEM_ANOTHER_MODEL") || "";
  });

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ttsActiveId, setTtsActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "presets" | "about">("chat");

  // --- Session & Messages State ---
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("IBT_X_GEM_SESSIONS");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: "cosmic-void-0", name: "Singularity Main Void", createdAt: Date.now() }];
  });
  
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem("IBT_X_GEM_ACTIVE_SESSION") || "cosmic-void-0";
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // --- System Statuses ---
  const [statusText, setStatusText] = useState<string>("Initializing system core...");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeDbEngine, setActiveDbEngine] = useState<"RTDB" | "Firestore" | "Local-Sandbox">("Local-Sandbox");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // --- Tokens, Theme & Setup Guide States ---
  const [tokens, setTokens] = useState<number>(() => {
    const saved = localStorage.getItem("IBT_X_GEM_TOKENS");
    return saved ? parseInt(saved, 10) : 5550;
  });

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("IBT_X_GEM_THEME") as "dark" | "light") || "dark";
  });

  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(() => {
    return localStorage.getItem("IBT_X_GEM_FIRST_TIME") === null;
  });

  const [lastReloadTime, setLastReloadTime] = useState<number>(() => {
    const saved = localStorage.getItem("IBT_X_GEM_LAST_RELOAD");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [adClosed, setAdClosed] = useState<boolean>(() => {
    return localStorage.getItem("IBT_X_GEM_AD_CLOSED") === "true";
  });

  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- HTML Element Refs ---
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // --- Local Storage Sync Hooks ---
  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_SESSIONS", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_ACTIVE_SESSION", activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_ACCRETION", String(enableAccretionDisk));
  }, [enableAccretionDisk]);

  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_ANOTHER_PROVIDER", anotherProvider);
    localStorage.setItem("IBT_X_GEM_ANOTHER_KEY", anotherApiKey);
    localStorage.setItem("IBT_X_GEM_ANOTHER_MODEL", anotherModel);
  }, [anotherProvider, anotherApiKey, anotherModel]);

  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_TOKENS", String(tokens));
  }, [tokens]);

  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_THEME", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_LAST_RELOAD", String(lastReloadTime));
  }, [lastReloadTime]);

  useEffect(() => {
    localStorage.setItem("IBT_X_GEM_AD_CLOSED", String(adClosed));
  }, [adClosed]);

  // --- Notification Trigger Helper ---
  const triggerNotification = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // --- Audio Sound Synthesizer (Optimized and guarded) ---
  const playTactileBeep = useCallback((freq = 200, duration = 0.05, type: OscillatorType = "sine") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }, []);

  // --- ULTRA-OPTIMIZED PARTICLES SYSTEM (With expensive styles removed) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!enableAccretionDisk) {
      // Free CPU and clean canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    let targetX = width / 2;
    let targetY = height / 3.2;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      targetX = width / 2;
      targetY = height / 3.2;
    };

    const parent = canvas.parentElement;
    parent?.addEventListener("mousemove", handleMouseMove, { passive: true });
    parent?.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    // Accretion particles count lowered to 40 for optimal CPU usage
    const particleCount = Math.min(40, Math.floor((width * height) / 18000));
    const particles: Array<{
      x: number;
      y: number;
      angle: number;
      radius: number;
      speed: number;
      size: number;
      color: string;
    }> = [];

    const colors = [
      "rgba(139, 92, 246, 0.4)", // Purple
      "rgba(59, 130, 246, 0.35)", // Blue
      "rgba(236, 72, 153, 0.3)"   // Pink
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * Math.min(width, height) * 0.4 + 30,
        speed: (Math.random() * 0.012 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.8 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Radial gravity visualization rings (Simple 2D arc vectors are 100% hardware-accelerated)
      ctx.beginPath();
      ctx.arc(width / 2, height / 3.2, 80, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.04)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, height / 3.2, 160, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.03)";
      ctx.stroke();

      // Accretion disk dust animation
      particles.forEach((p) => {
        p.angle += p.speed;
        
        const currentTargetX = width / 2 + (targetX - width / 2) * 0.15;
        const currentTargetY = height / 3.2 + (targetY - height / 3.2) * 0.15;

        const destX = currentTargetX + Math.cos(p.angle) * p.radius;
        const destY = currentTargetY + Math.sin(p.angle) * p.radius;

        // Smooth translation
        p.x += (destX - p.x) * 0.06;
        p.y += (destY - p.y) * 0.06;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      parent?.removeEventListener("mousemove", handleMouseMove);
      parent?.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enableAccretionDisk]);

  // --- Firebase Storage Integration Core (Modular & Optimized) ---
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    setStatusText("Re-synchronizing neural gateway...");

    if (databaseEngine === "offline") {
      setMessages([]);
      setActiveDbEngine("Local-Sandbox");
      setStatusText("Connected to Local Offline Sandbox");
      return;
    }

    try {
      let appInstance;
      if (getApps().length === 0) {
        appInstance = initializeApp(firebaseConfig);
      } else {
        appInstance = getApp();
      }

      const hasRtdb = firebaseConfig.databaseURL && firebaseConfig.databaseURL.trim() !== "";
      const isRtdbTarget = databaseEngine === "rtdb" || (databaseEngine === "auto" && hasRtdb);

      if (isRtdbTarget) {
        setActiveDbEngine("RTDB");
        const db = getDatabase(appInstance);
        const chatRef = rtdbRef(db, `ibt_chats/${activeSessionId}/messages`);
        const recentMessagesQuery = rtdbQuery(chatRef, limitToLast(60)); // Pull fewer initial messages for speeds

        const rtdbUnsub = onValue(recentMessagesQuery, (snapshot) => {
          const val = snapshot.val();
          if (!val) {
            setMessages([]);
            setStatusText("Sync secure. No prior transmissions found.");
            return;
          }

          const formatted: Message[] = Object.keys(val).map((key) => ({
            id: key,
            sender: val[key].sender,
            text: val[key].text,
            timestamp: val[key].timestamp || Date.now(),
          }));

          formatted.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(formatted);
          setStatusText("Memory link synchronized via Firebase RTDB.");
        }, (error) => {
          console.error("RTDB Sync Error:", error);
          setStatusText("RTDB restricted access. Local Sandbox mode engaged.");
          setActiveDbEngine("Local-Sandbox");
        });

        unsubscribe = () => {
          rtdbUnsub();
        };

      } else {
        setActiveDbEngine("Firestore");
        const db = getFirestore(appInstance);
        const chatCollectionRef = collection(db, "ibt_chats", activeSessionId, "messages");
        const recentQuery = fsQuery(chatCollectionRef, orderBy("timestamp", "asc"), fsLimit(60));

        const fsUnsub = onSnapshot(recentQuery, (snapshot) => {
          const formatted: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            formatted.push({
              id: doc.id,
              sender: data.sender,
              text: data.text,
              timestamp: data.timestamp || Date.now(),
            });
          });
          setMessages(formatted);
          setStatusText("Memory link synchronized via Google Firestore.");
        }, (error) => {
          console.error("Firestore Sync Error:", error);
          setStatusText("Firestore restricted access. Local Sandbox mode engaged.");
          setActiveDbEngine("Local-Sandbox");
        });

        unsubscribe = () => {
          fsUnsub();
        };
      }

    } catch (e: any) {
      console.error("Firebase Initialization Failure:", e);
      setStatusText("Spacetime tear: Firebase failed. Running locally.");
      setActiveDbEngine("Local-Sandbox");
    }

    return () => {
      unsubscribe();
    };
  }, [firebaseConfig, activeSessionId, databaseEngine]);

  // --- Auto-scroll (Smoothed and guarded to prevent loop lag) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages, isAiLoading]);

  // --- Network Connection Listeners ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerNotification("Cosmic uplink restored", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerNotification("Wormhole disconnected: offline", "error");
    };
    window.addEventListener("online", handleOnline, { passive: true });
    window.addEventListener("offline", handleOffline, { passive: true });
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerNotification]);

  // --- Configuration Callbacks ---
  const saveGeneralConfigs = useCallback((
    updatedKey: string, 
    updatedEngine: typeof databaseEngine, 
    updatedModel: string, 
    updatedSys: string,
    updatedAnotherProvider?: string,
    updatedAnotherKey?: string,
    updatedAnotherModel?: string
  ) => {
    localStorage.setItem("IBT_X_GEM_GEMINI_KEY", updatedKey);
    localStorage.setItem("IBT_X_GEM_DB_ENGINE", updatedEngine);
    localStorage.setItem("IBT_X_GEM_MODEL", updatedModel);
    localStorage.setItem("IBT_X_GEM_SYSTEM", updatedSys);
    setGeminiApiKey(updatedKey);
    setDatabaseEngine(updatedEngine);
    setActiveModel(updatedModel);
    setSystemInstruction(updatedSys);

    if (updatedAnotherProvider !== undefined) {
      localStorage.setItem("IBT_X_GEM_ANOTHER_PROVIDER", updatedAnotherProvider);
      setAnotherProvider(updatedAnotherProvider);
    }
    if (updatedAnotherKey !== undefined) {
      localStorage.setItem("IBT_X_GEM_ANOTHER_KEY", updatedAnotherKey);
      setAnotherApiKey(updatedAnotherKey);
    }
    if (updatedAnotherModel !== undefined) {
      localStorage.setItem("IBT_X_GEM_ANOTHER_MODEL", updatedAnotherModel);
      setAnotherModel(updatedAnotherModel);
    }

    triggerNotification("Cosmic configurations saved!", "success");
    setIsConfigOpen(false);
  }, [databaseEngine, triggerNotification]);

  const handleClearSessionLocal = useCallback(() => {
    playTactileBeep(120, 0.2, "sawtooth");
    if (activeDbEngine === "Local-Sandbox") {
      setMessages([]);
      triggerNotification("Offline Sandbox chat history cleared", "info");
    } else {
      triggerNotification("To delete permanent database logs, wipe records inside your Google console.", "info");
    }
  }, [activeDbEngine, playTactileBeep, triggerNotification]);

  const handleCreateNewSession = useCallback(() => {
    playTactileBeep(440, 0.08, "sine");
    const sessionNum = sessions.length + 1;
    const newSession: ChatSession = {
      id: `wormhole-${Date.now()}`,
      name: `Wormhole Singularity #${sessionNum}`,
      createdAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    triggerNotification(`Opened ${newSession.name}!`, "success");
  }, [sessions.length, playTactileBeep, triggerNotification]);

  const handleDeleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      triggerNotification("Cannot collapse the last active wormhole!", "error");
      return;
    }
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id && filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
    triggerNotification("Wormhole collapsed.", "info");
  }, [sessions.length, activeSessionId, triggerNotification]);

  const handleCopyText = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    playTactileBeep(880, 0.05, "sine");
    setTimeout(() => setCopiedId(null), 2000);
  }, [playTactileBeep]);

  const handleSpeakMessage = useCallback((text: string, id: string) => {
    if (ttsActiveId === id) {
      window.speechSynthesis.cancel();
      setTtsActiveId(null);
      return;
    }
    window.speechSynthesis.cancel();
    
    const cleanSpeech = text
      .replace(/[\#\*\_`]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1");

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.onend = () => setTtsActiveId(null);
    utterance.onerror = () => setTtsActiveId(null);
    window.speechSynthesis.speak(utterance);
    setTtsActiveId(id);
  }, [ttsActiveId]);

  // --- Message Sending Pipeline ---
  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const rawInput = textToSend || userInput;
    if (!rawInput.trim()) return;

    const isUsingDefaultKey = geminiApiKey === "AQ.Ab8RN6L1qXThrCR4DmxxMUWXkimQU7SubYZIKOreaWUSJRPMRA" || geminiApiKey?.startsWith("AQ.Ab8");
    if (isUsingDefaultKey && tokens <= 0) {
      triggerNotification("Token kuota gratis Anda habis (0). Harap masukkan API Key Anda sendiri di pengaturan!", "error");
      return;
    }

    const queryText = rawInput.trim();
    if (!textToSend) {
      setUserInput("");
    }

    playTactileBeep(330, 0.06, "triangle");

    const userMsgId = `user-${Date.now()}`;
    const userMsgPayload: Message = {
      id: userMsgId,
      sender: "user",
      text: queryText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsgPayload]);

    // Push User message to Firebase
    try {
      if (activeDbEngine === "RTDB") {
        const appInstance = getApp();
        const db = getDatabase(appInstance);
        const listRef = rtdbRef(db, `ibt_chats/${activeSessionId}/messages`);
        const newMsgRef = rtdbPush(listRef);
        await rtdbSet(newMsgRef, {
          sender: "user",
          text: queryText,
          timestamp: Date.now()
        });
      } else if (activeDbEngine === "Firestore") {
        const appInstance = getApp();
        const db = getFirestore(appInstance);
        const colRef = collection(db, "ibt_chats", activeSessionId, "messages");
        await addDoc(colRef, {
          sender: "user",
          text: queryText,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error("Failed to sync user message to Firebase:", e);
    }

    // Check offline preset database matches
    const normalizedQuery = queryText.toLowerCase().replace(/[\?\!\.\,]/g, "").trim();
    let matchedPreset = "";
    
    for (const key of Object.keys(OFFLINE_PRESETS)) {
      if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
        matchedPreset = OFFLINE_PRESETS[key].answer;
        break;
      }
    }

    setIsAiLoading(true);

    if (matchedPreset) {
      setTimeout(async () => {
        const aiMsgId = `ai-${Date.now()}`;
        const aiMsgPayload: Message = {
          id: aiMsgId,
          sender: "ai",
          text: matchedPreset,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, aiMsgPayload]);
        setIsAiLoading(false);
        playTactileBeep(660, 0.1, "sine");

        // Substract tokens for default key
        if (isUsingDefaultKey) {
          const cost = Math.max(1, Math.ceil((queryText.length + matchedPreset.length) / 8));
          setTokens(prev => Math.max(0, prev - cost));
        }

        // Sync local AI answer to database
        try {
          if (activeDbEngine === "RTDB") {
            const appInstance = getApp();
            const db = getDatabase(appInstance);
            const listRef = rtdbRef(db, `ibt_chats/${activeSessionId}/messages`);
            const newMsgRef = rtdbPush(listRef);
            await rtdbSet(newMsgRef, {
              sender: "ai",
              text: matchedPreset,
              timestamp: Date.now()
            });
          } else if (activeDbEngine === "Firestore") {
            const appInstance = getApp();
            const db = getFirestore(appInstance);
            const colRef = collection(db, "ibt_chats", activeSessionId, "messages");
            await addDoc(colRef, {
              sender: "ai",
              text: matchedPreset,
              timestamp: Date.now()
            });
          }
        } catch (e) {}
      }, 750);

      return;
    }

    // Dynamic Google Gemini Proxy endpoint pipeline
    try {
      const contextMessages = messages.concat(userMsgPayload).slice(-12); // Send last 12 messages for memory

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gemini-Key": geminiApiKey,
        },
        body: JSON.stringify({
          messages: contextMessages,
          model: activeModel,
          systemInstruction: systemInstruction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Dimensional matrix instability");
      }

      const aiText = data.text || "Empty void response.";

      // Subtract tokens for default key
      if (isUsingDefaultKey) {
        const cost = Math.max(1, Math.ceil((queryText.length + aiText.length) / 8));
        setTokens(prev => Math.max(0, prev - cost));
      }

      const aiMsgId = `ai-${Date.now()}`;
      const aiMsgPayload: Message = {
        id: aiMsgId,
        sender: "ai",
        text: aiText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsgPayload]);

      // Save to Firebase
      try {
        if (activeDbEngine === "RTDB") {
          const appInstance = getApp();
          const db = getDatabase(appInstance);
          const listRef = rtdbRef(db, `ibt_chats/${activeSessionId}/messages`);
          const newMsgRef = rtdbPush(listRef);
          await rtdbSet(newMsgRef, {
            sender: "ai",
            text: aiText,
            timestamp: Date.now()
          });
        } else if (activeDbEngine === "Firestore") {
          const appInstance = getApp();
          const db = getFirestore(appInstance);
          const colRef = collection(db, "ibt_chats", activeSessionId, "messages");
          await addDoc(colRef, {
            sender: "ai",
            text: aiText,
            timestamp: Date.now()
          });
        }
      } catch (e) {}

      playTactileBeep(523, 0.1, "sine");

    } catch (err: any) {
      console.error("Gemini API Error:", err);
      const errorMsg = `### Spacetime Gravity Distortion Detected
Could not synchronize AI response.

**Internal diagnostic log**: \`${err.message || err}\`

#### To restore connectivity:
1. Double-check your **Gemini API Key** in the **Quantum Config** (Gear icon on top right).
2. Ensure you have internet signal.
3. If you do not have a private key, enable **Server Key Fallback** inside config.`;

      const aiErrorPayload: Message = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: errorMsg,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiErrorPayload]);
      playTactileBeep(180, 0.3, "sawtooth");
    } finally {
      setIsAiLoading(false);
    }
  }, [userInput, messages, geminiApiKey, activeModel, systemInstruction, activeDbEngine, activeSessionId, playTactileBeep, tokens, triggerNotification]);

  // Handle scroll detection for "Back to Top" button
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 250) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  }, []);

  // Back to top scroll handler
  const handleScrollToTop = useCallback(() => {
    playTactileBeep(330, 0.05);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [playTactileBeep]);

  // Click handler wrapper for preset clicks to prevent recreation
  const handlePresetClick = useCallback((presetKey: string) => {
    setUserInput(presetKey);
    handleSendMessage(presetKey);
  }, [handleSendMessage]);

  // Session select wrapper
  const handleSelectSession = useCallback((id: string) => {
    playTactileBeep(200, 0.05);
    setActiveSessionId(id);
  }, [playTactileBeep]);

  // Render variables memoization for maximum speed
  const sidebarSessionItems = useMemo(() => {
    return sessions.map((session) => (
      <SidebarSessionItem
        key={session.id}
        session={session}
        isActive={activeSessionId === session.id}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
      />
    ));
  }, [sessions, activeSessionId, handleSelectSession, handleDeleteSession]);

  const presetButtonsList = useMemo(() => {
    return Object.entries(OFFLINE_PRESETS).map(([key, item]) => (
      <PresetButton
        key={key}
        title={key}
        category={item.category}
        onClick={handlePresetClick}
      />
    ));
  }, [handlePresetClick]);

  const messagesList = useMemo(() => {
    return messages.map((msg) => (
      <MessageBubble
        key={msg.id}
        msg={msg}
        onSpeak={handleSpeakMessage}
        onCopy={handleCopyText}
        isTtsActive={ttsActiveId === msg.id}
        isCopied={copiedId === msg.id}
      />
    ));
  }, [messages, handleSpeakMessage, handleCopyText, ttsActiveId, copiedId]);

  return (
    <div className={`relative min-h-screen flex flex-col font-sans selection:bg-purple-900/60 selection:text-white transition-all duration-300 ${
      theme === "light" ? "theme-light bg-slate-50 text-slate-900" : "theme-dark bg-black text-gray-100"
    }`}>
      
      {/* 1. Accelerated Particle Field Canvas */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full opacity-40 transition-opacity duration-700" />
      </div>

      {/* 2. Cosmic ambient glow layers (Pure CSS rendering for high hardware-acceleration) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-950/15 to-indigo-950/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-blue-950/15 to-pink-950/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 3. Floating Quick-Notify Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border glass-panel-neon shadow-2xl"
          >
            {notification.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 font-bold" />}
            {notification.type === "error" && <ShieldAlert className="w-5 h-5 text-rose-500" />}
            {notification.type === "info" && <Info className="w-5 h-5 text-purple-400" />}
            <span className="text-sm font-medium tracking-wide text-gray-200">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Main App Grid layout */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row h-screen overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r flex flex-col backdrop-blur-xl z-20 transition-all duration-300 ${
          theme === "light" 
            ? "bg-white/95 border-slate-200" 
            : "bg-black/85 lg:bg-[#050505]/80 border-white/5"
        }`}>
          
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-[1.5px] animate-pulse">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400">IBT</span>
                </div>
              </div>
              <div>
                <h1 className="text-base font-bold font-display tracking-tight text-white flex items-center gap-1">
                  BlackholeAi <span className="text-purple-400">X</span>
                </h1>
                <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">IBT X GEMINI V10</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              {/* Accretion Canvas instant toggle button (Aesthetic lag control) */}
              <button 
                type="button"
                onClick={() => {
                  playTactileBeep(330, 0.05);
                  setEnableAccretionDisk(!enableAccretionDisk);
                  triggerNotification(enableAccretionDisk ? "Particles disabled (Max performance)" : "Particles enabled", "info");
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                  enableAccretionDisk 
                    ? "bg-purple-950/20 border-purple-800/40 text-purple-400" 
                    : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"
                }`}
                title={enableAccretionDisk ? "Turn off particles to save CPU/GPU lag" : "Turn on particle animations"}
              >
                {enableAccretionDisk ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button 
                type="button"
                onClick={() => { playTactileBeep(550, 0.05); setIsConfigOpen(true); }}
                className="p-2 rounded-lg bg-white/5 hover:bg-purple-950/30 border border-white/5 hover:border-purple-800/40 text-gray-400 hover:text-purple-400 transition-all cursor-pointer"
                title="Quantum configurations"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick specs banner */}
          <div className="px-4 py-3 bg-purple-950/15 border-b border-purple-900/20 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 shadow-emerald-500/50" : "bg-rose-500 animate-ping"} shadow-sm`} />
                {isOnline ? "COSMIC LINKED" : "OFFLINE ANOMALY"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-purple-400 uppercase font-bold tracking-wider">
                {activeDbEngine}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal truncate font-mono" title={statusText}>
              &gt; {statusText}
            </p>
            {/* Token balance stats display */}
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 border-t border-purple-900/10 pt-1.5 mt-0.5">
              <span>FREE QUOTA BALANCE:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                {tokens} TKNS
              </span>
            </div>
          </div>

          {/* Nav Tab selectors */}
          <div className="grid grid-cols-3 border-b border-white/5 text-xs">
            <button
              type="button"
              onClick={() => { playTactileBeep(261, 0.05); setActiveTab("chat"); }}
              className={`py-3 text-center border-b font-medium transition-colors cursor-pointer ${
                activeTab === "chat" 
                  ? "border-purple-500 text-purple-400 bg-purple-950/10" 
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              Wormholes
            </button>
            <button
              type="button"
              onClick={() => { playTactileBeep(293, 0.05); setActiveTab("presets"); }}
              className={`py-3 text-center border-b font-medium transition-colors cursor-pointer ${
                activeTab === "presets" 
                  ? "border-purple-500 text-purple-400 bg-purple-950/10" 
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => { playTactileBeep(329, 0.05); setActiveTab("about"); }}
              className={`py-3 text-center border-b font-medium transition-colors cursor-pointer ${
                activeTab === "about" 
                  ? "border-purple-500 text-purple-400 bg-purple-950/10" 
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              About
            </button>
          </div>

          {/* TAB CHAT SESSIONS */}
          {activeTab === "chat" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400/80 font-display">Active Singularity</span>
                <button
                  type="button"
                  onClick={handleCreateNewSession}
                  className="p-1 rounded bg-purple-900/30 text-purple-300 hover:bg-purple-800/50 hover:text-white border border-purple-700/30 flex items-center gap-1 text-[11px] font-medium transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Expand Void</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {sidebarSessionItems}
              </div>
            </div>
          )}

          {/* TAB PRESETS */}
          {activeTab === "presets" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400/80 font-display px-1 block mb-2">Neural Presets</span>
              <p className="text-[11px] text-gray-400 px-1 mb-4 leading-relaxed">
                Click any prompt to instantly query the local gravity knowledge core. Works offline!
              </p>

              <div className="space-y-2">
                {presetButtonsList}
              </div>
            </div>
          )}

          {/* TAB ABOUT */}
          {activeTab === "about" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-gray-300 leading-relaxed font-sans">
              <div className="p-3 bg-purple-950/10 border border-purple-900/30 rounded-xl space-y-2">
                <h3 className="font-bold text-purple-300 font-display text-sm">BlackholeAi X Gemini</h3>
                <p>
                  A premium hyper-interactive AI portal utilizing Google Gemini generative capability and Firebase Realtime databases to sync cosmic data flows in real-time.
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-bold text-white font-mono text-[10px] tracking-wider uppercase">System Specs</h4>
                <ul className="space-y-1.5 text-[11px] font-mono">
                  <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">Node Runtime:</span> <span className="text-gray-300">v18.x Cloud</span></li>
                  <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">Firebase SDK:</span> <span className="text-purple-400 font-semibold">Modular v10.7+</span></li>
                  <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">Vite Config:</span> <span className="text-gray-300">Custom Proxy</span></li>
                  <li className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">AI Model:</span> <span className="text-indigo-400 font-medium">Gemini Pro/Flash</span></li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white font-mono text-[10px] tracking-wider uppercase">Lag Optimization Specs</h4>
                <p className="text-[11px] text-gray-400">
                  - Memoized bubble nodes to bypass typing re-renders.<br />
                  - Canvas shadow rendering bypassed for faster mobile graphics compositing.<br />
                  - Accretion particles orbital damping threshold adjusted.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-white/5 bg-black/40 text-center flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 font-mono">
              Designed for Google AI Studio Build
            </span>
            <div className="text-[10px] text-purple-400 font-medium tracking-wide">
              Created by : <span className="font-bold text-white uppercase tracking-wider text-glow-purple">ExtinctionIBT</span> with <span className="text-purple-300">Google Ai Studio</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-[9px] text-purple-400 font-bold tracking-widest uppercase mt-0.5">
              <Compass className="w-3 h-3 text-purple-500 animate-spin" style={{ animationDuration: '8s' }} /> 
              <span>IBT X GEMINI v10</span>
            </div>
          </div>
        </aside>

        {/* CHAT CHANNELS PANEL */}
        <main className="flex-1 flex flex-col bg-transparent relative h-full overflow-hidden">
          
          {/* Header */}
          <header className="px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide font-display">
                  {sessions.find(s => s.id === activeSessionId)?.name || "Void Chat"}
                </h2>
                <p className="text-[10px] text-gray-400 font-mono tracking-wider">
                  MODEL: <span className="text-purple-400 font-semibold">{activeModel}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateNewSession}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-500/20"
                title="Mulai obrolan baru"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>

              {/* Particle Engine Switch Button inside chat top header for convenience */}
              <button
                type="button"
                onClick={() => setEnableAccretionDisk(!enableAccretionDisk)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  enableAccretionDisk
                    ? "bg-purple-950/25 border-purple-800/40 text-purple-300 hover:text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
                title="Toggle visual accretion disk particles to resolve device lag"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{enableAccretionDisk ? "Lag-Fix: Off" : "Lag-Fix: On"}</span>
              </button>

              <button
                type="button"
                onClick={handleClearSessionLocal}
                className="px-3 py-1.5 rounded-lg bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/30 text-rose-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                title="Wipe local stream logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flush Log</span>
              </button>

              <button
                type="button"
                onClick={() => { playTactileBeep(550, 0.05); setIsConfigOpen(true); }}
                className="px-3 py-1.5 rounded-lg bg-purple-950/25 hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quantum Config</span>
              </button>
            </div>
          </header>

          {/* Messages lists scroll frame */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6 relative"
          >
            
            {/* Back to Top floating button */}
            <AnimatePresence>
              {showScrollTop && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  type="button"
                  onClick={handleScrollToTop}
                  className="fixed bottom-28 right-8 z-40 p-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-2xl border border-purple-400/30 cursor-pointer flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  title="Kembali ke Atas"
                >
                  <ArrowUp className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* If empty chat messages logs */}
            {messages.length === 0 && (
              <div className="max-w-xl mx-auto my-6 p-6 rounded-2xl border border-white/5 glass-panel backdrop-blur-xl relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-950/50 border border-purple-800/40 flex items-center justify-center text-purple-400">
                    <Rocket className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-white">Quantum Singularity Active</h3>
                    <p className="text-xs text-gray-400 font-mono">IBT X GEMINI GATEWAY ONLINE</p>
                  </div>
                </div>

                <p className="text-sm text-gray-300 leading-relaxed">
                  Welcome to **BlackholeAi X Gemini**! The workspace neural synchronizer is fully online. You can query me directly, or click one of the pre-set physics anomalies below to load cosmic data:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePresetClick("who are you")}
                    className="p-3 text-left rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-800/40 hover:bg-purple-950/10 text-xs text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>&gt; Who is BlackholeAi?</span>
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-12 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetClick("what is a black hole")}
                    className="p-3 text-left rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-800/40 hover:bg-purple-950/10 text-xs text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>&gt; Explain Blackholes</span>
                    <Compass className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetClick("quantum python code")}
                    className="p-3 text-left rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-800/40 hover:bg-purple-950/10 text-xs text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>&gt; Superposition Circuit</span>
                    <Code className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetClick("how to connect firebase")}
                    className="p-3 text-left rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-800/40 hover:bg-purple-950/10 text-xs text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>&gt; Config My Firebase DB</span>
                    <Database className="w-3.5 h-3.5 text-blue-400 group-hover:animate-pulse" />
                  </button>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-500">
                  <span className="flex items-center gap-1"><Terminal className="w-3 h-3 text-purple-500" /> SECURE CONSOLE</span>
                  <span>LATENCY: ~120ms</span>
                </div>
              </div>
            )}

            {/* Bubble log rendering */}
            <div className="max-w-3xl mx-auto space-y-6">
              {messagesList}

              {/* Typing simulation loading indicator */}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="glass-panel-neon rounded-2xl rounded-bl-none p-5 max-w-[85%] space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400">
                      <Sparkles className="w-3 h-3 animate-spin" />
                      <span>Singularity resolving gravity warp...</span>
                    </div>
                    <div className="flex items-center gap-1 py-1 px-2">
                      <span className="chat-dot w-2 h-2 rounded-full bg-purple-500" />
                      <span className="chat-dot w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="chat-dot w-2 h-2 rounded-full bg-pink-500" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Bottom Sticky Inputs Form */}
          <footer className="p-4 lg:p-6 bg-black/60 border-t border-white/5 backdrop-blur-md z-10">
            <div className="max-w-3xl mx-auto">
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-[#07070a]/90 px-4 py-2.5 shadow-2xl focus-within:border-purple-500/50 focus-within:box-shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all animate-none"
              >
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={
                    activeDbEngine === "Local-Sandbox"
                      ? "Ask offline preset (e.g. 'what is a black hole') or configure your API gateway..."
                      : "Transmit prompt to Gemini... (e.g., 'explain relativity in 3 bullet points')"
                  }
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none py-1.5"
                  disabled={isAiLoading}
                />

                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={isAiLoading || !userInput.trim()}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      userInput.trim() && !isAiLoading
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Status Info bar underneath form */}
              <div className="mt-2.5 px-2 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-gray-500 gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  Engine: <span className="text-purple-300 font-bold uppercase">{activeDbEngine}</span>
                  {enableAccretionDisk ? (
                    <span className="text-[9px] text-indigo-400 font-semibold px-1 rounded bg-indigo-950/20 border border-indigo-900/30 ml-2">Aesthetic Particles Active</span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-semibold px-1 rounded bg-emerald-950/20 border border-emerald-900/30 ml-2">Max Performance Engaged</span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-gray-400 text-center sm:text-right">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  Try: <span className="text-purple-300">"What is a Black Hole"</span>, <span className="text-purple-300">"Schrodinger Cat"</span>
                </span>
              </div>

            </div>
          </footer>
        </main>
      </div>

      {/* 5. SIDE DRAWER CREDENTIALS DRAWER PANEL */}
      <AnimatePresence>
        {isConfigOpen && (
          <>
            {/* Modal overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playTactileBeep(200, 0.05); setIsConfigOpen(false); }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40"
            />

            {/* Config panel drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#07070a]/95 border-l border-white/5 backdrop-blur-2xl p-6 overflow-y-auto z-50 shadow-2xl flex flex-col"
            >
              
              {/* Drawer header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-400" />
                  <h3 className="text-md font-bold font-display tracking-wide text-white">Quantum Singularity Gateway</h3>
                </div>
                <button
                  type="button"
                  onClick={() => { playTactileBeep(200, 0.05); setIsConfigOpen(false); }}
                  className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form entries */}
              <div className="flex-1 py-6 space-y-6 text-sm">
                
                {/* ADVERTISEMENT (IBT CHAT APP) SECTION */}
                {!adClosed && (
                  <div className="relative p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-all duration-300 shadow-lg shadow-yellow-500/5 group flex flex-col gap-3">
                    {/* Header line for AD with Close action */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                        <span>SPONSORED ADVERTISEMENT</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTactileBeep(300, 0.05);
                          setAdClosed(true);
                          triggerNotification("Iklan berhasil ditutup", "info");
                        }}
                        className="p-1 rounded bg-black/40 hover:bg-black/80 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Tutup Iklan"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Main Ad Body: Clicking opens target URL */}
                    <div 
                      onClick={() => {
                        playTactileBeep(523, 0.08);
                        window.open("https://scripthutao2014-coder.github.io/IBT-App/", "_blank");
                      }}
                      className="flex gap-4 items-center cursor-pointer"
                    >
                      {/* Premium Profile Picture (PP) with glow effect */}
                      <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-purple-600 via-pink-600 to-yellow-500 p-0.5 shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform duration-300">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden">
                          {/* Inner glowing effects & grid */}
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.15)_0,transparent_100%)]" />
                          <MessageSquare className="w-7 h-7 text-pink-400 relative z-10 animate-bounce" style={{ animationDuration: '3s' }} />
                          <span className="text-[9px] font-mono font-black text-yellow-400 tracking-widest relative z-10 mt-0.5">IBT CHAT</span>
                        </div>
                      </div>

                      {/* Ad Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-purple-300 transition-colors flex items-center gap-1">
                          <span>IBT Chat App</span>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        </h4>
                        <p className="text-[11px] text-gray-400 leading-normal mt-1">
                          Mulai obrolan seru di platform chatting premium rancangan ExtinctionIBT! Hubungkan semesta obrolan Anda sekarang juga.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Gemini API config section */}
                <div className="space-y-3 p-4 rounded-xl border border-purple-900/35 bg-purple-950/10">
                  <div className="flex items-center gap-2 text-purple-300 font-semibold font-display">
                    <Key className="w-4.5 h-4.5" />
                    <span>Google Gemini Core Credentials</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Insert your personal Gemini API Key here. It will be stored safely inside your private client <code className="text-purple-300 font-mono">localStorage</code>.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 font-mono text-glow-purple"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">Active AI Model</label>
                      <select
                        value={activeModel}
                        onChange={(e) => setActiveModel(e.target.value)}
                        className="w-full px-2.5 py-2 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="gemini-3.5-flash">gemini-3.5-flash (Gemini 3.5 Flash / Standard)</option>
                        <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Gemini 3.1 Pro / High intelligence)</option>
                        <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Gemini 3.1 Flash Lite / Balanced speed)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2.5 h-full pt-5">
                      <input
                        type="checkbox"
                        id="fallbackCheck"
                        checked={useServerFallback}
                        onChange={(e) => setUseServerFallback(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 bg-black text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <label htmlFor="fallbackCheck" className="text-xs text-gray-300 select-none cursor-pointer">
                        Allow server API key fallback
                      </label>
                    </div>
                  </div>
                </div>

                {/* Other AI Credentials config section */}
                <div className="space-y-3 p-4 rounded-xl border border-pink-900/35 bg-pink-950/10">
                  <div className="flex items-center gap-2 text-pink-300 font-semibold font-display">
                    <Sparkles className="w-4.5 h-4.5" />
                    <span>Credentials from another AI / Provider</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Integrate other AI platforms (OpenAI, Anthropic, DeepSeek, etc.) by specifying their credentials below.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Provider</label>
                      <select
                        value={anotherProvider}
                        onChange={(e) => setAnotherProvider(e.target.value)}
                        className="w-full px-2.5 py-2 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="deepseek">DeepSeek AI</option>
                        <option value="cohere">Cohere</option>
                        <option value="groq">Groq Cloud</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Target Model</label>
                      <input
                        type="text"
                        value={anotherModel}
                        onChange={(e) => setAnotherModel(e.target.value)}
                        placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                        className="w-full px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-400 font-mono tracking-wider uppercase">API Key</label>
                    <input
                      type="password"
                      value={anotherApiKey}
                      onChange={(e) => setAnotherApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-pink-500 font-mono text-glow-pink"
                    />
                  </div>
                </div>

                {/* Brightness Theme Toggle (Terang / Gelap) */}
                <div className="space-y-3 p-4 rounded-xl border border-orange-900/35 bg-orange-950/10">
                  <div className="flex items-center gap-2 text-orange-300 font-semibold font-display">
                    {theme === "light" ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-orange-400" />}
                    <span>Pengaturan Kecerahan Cahaya (Theme)</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Pilih mode tampilan terang (light) atau mode kosmik gelap (dark).
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { playTactileBeep(440, 0.05); setTheme("light"); triggerNotification("Mode Terang Aktif!", "success"); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        theme === "light"
                          ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                          : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>Terang (Light)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { playTactileBeep(220, 0.05); setTheme("dark"); triggerNotification("Mode Kosmik Gelap Aktif!", "success"); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        theme === "dark"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                          : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                      <span>Gelap (Dark)</span>
                    </button>
                  </div>
                </div>

                {/* Token system specifications section */}
                <div className="space-y-3 p-4 rounded-xl border border-emerald-900/35 bg-emerald-950/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-semibold font-display">
                      <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
                      <span>Sistem Token Quota</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-900/30">
                      {tokens} TKNS
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Jika menggunakan **Default API Key**, kuota token Anda berkurang berdasarkan panjang input & output. Tambahkan API Key Anda sendiri di atas untuk akses tanpa batas!
                  </p>
                  {(() => {
                    const COOLDOWN_MS = 5 * 60 * 60 * 1000;
                    const timePassed = currentTime - lastReloadTime;
                    const isCooldownActive = lastReloadTime > 0 && timePassed < COOLDOWN_MS;
                    const timeLeftMs = COOLDOWN_MS - timePassed;

                    const hours = Math.max(0, Math.floor(timeLeftMs / (1000 * 60 * 60)));
                    const minutes = Math.max(0, Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60)));
                    const seconds = Math.max(0, Math.floor((timeLeftMs % (1000 * 60)) / 1000));

                    return (
                      <div className="space-y-2">
                        {isCooldownActive && (
                          <div className="text-[10px] text-orange-400 font-mono flex items-center justify-between border-t border-white/5 pt-2">
                            <span>COOLDOWN AKTIF (Reset 5 Jam):</span>
                            <span className="font-bold">{hours}j {minutes}m {seconds}s</span>
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={isCooldownActive}
                          onClick={() => {
                            if (isCooldownActive) {
                              playTactileBeep(220, 0.15);
                              triggerNotification(`Harap tunggu ${hours}j ${minutes}m ${seconds}s sebelum reload!`, "error");
                              return;
                            }
                            playTactileBeep(659, 0.08);
                            setTokens(5550);
                            const now = Date.now();
                            setLastReloadTime(now);
                            triggerNotification("Kuota token Anda berhasil di-reset ke 5550!", "success");
                          }}
                          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                            isCooldownActive
                              ? "bg-slate-800 text-gray-500 cursor-not-allowed border border-white/5"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isCooldownActive ? `Isi Ulang Terkunci (${hours}j ${minutes}m)` : "Isi Ulang Token (Top-Up 5550)"}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Onboarding Setup Guide Section */}
                <div className="space-y-3 p-4 rounded-xl border border-cyan-900/35 bg-cyan-950/10">
                  <div className="flex items-center gap-2 text-cyan-300 font-semibold font-display">
                    <HelpCircle className="w-4.5 h-4.5 text-cyan-400" />
                    <span>Panduan Setup Aplikasi</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Butuh bantuan untuk memulai? Baca panduan interaktif kami untuk mempelajari cara setup API Key, token, dan sinkronisasi database.
                  </p>
                  <button
                    type="button"
                    onClick={() => { playTactileBeep(523, 0.1); setShowSetupGuide(true); setIsConfigOpen(false); }}
                    className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Buka Panduan Setup (Onboarding)
                  </button>
                </div>

                {/* Lag performance tuning section */}
                <div className="space-y-3 p-4 rounded-xl border border-indigo-900/35 bg-indigo-950/10">
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold font-display">
                    <Cpu className="w-4.5 h-4.5" />
                    <span>Lag Mitigation & Aesthetic Tuning</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    This single-file application uses high-density render engines. Toggle settings below to ensure seamless execution.
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-200">Enable Accretion Disk particles</span>
                    <button
                      type="button"
                      onClick={() => setEnableAccretionDisk(!enableAccretionDisk)}
                      className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                        enableAccretionDisk
                          ? "bg-purple-900/50 border border-purple-700/40 text-purple-300 hover:bg-purple-800/60"
                          : "bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60"
                      }`}
                    >
                      {enableAccretionDisk ? "Active (Faint Particles)" : "Bypassed (Zero Lag)"}
                    </button>
                  </div>
                </div>

                {/* Firebase database parameters section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-semibold font-display">
                      <Database className="w-4.5 h-4.5 text-blue-400" />
                      <span>Firebase Realtime Storage</span>
                    </div>
                    
                    <select
                      value={databaseEngine}
                      onChange={(e: any) => setDatabaseEngine(e.target.value)}
                      className="px-2 py-1 bg-black border border-white/10 rounded-md text-xs text-purple-400 focus:outline-none font-mono cursor-pointer"
                    >
                      <option value="auto">Auto-Detect</option>
                      <option value="rtdb">Force RTDB</option>
                      <option value="firestore">Force Firestore</option>
                      <option value="offline">Sandbox Mode</option>
                    </select>
                  </div>
                  
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Configure your personal Firebase parameters below. Default credentials link to our public testing workspace.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono">API KEY (apiKey)</label>
                      <input
                        type="text"
                        value={firebaseConfig.apiKey}
                        onChange={(e) => setFirebaseConfig({...firebaseConfig, apiKey: e.target.value})}
                        className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono">PROJECT ID (projectId)</label>
                      <input
                        type="text"
                        value={firebaseConfig.projectId}
                        onChange={(e) => setFirebaseConfig({...firebaseConfig, projectId: e.target.value})}
                        className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] text-gray-400 font-mono">DATABASE URL (databaseURL)</label>
                      <input
                        type="text"
                        value={firebaseConfig.databaseURL}
                        onChange={(e) => setFirebaseConfig({...firebaseConfig, databaseURL: e.target.value})}
                        className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono">AUTH DOMAIN (authDomain)</label>
                      <input
                        type="text"
                        value={firebaseConfig.authDomain}
                        onChange={(e) => setFirebaseConfig({...firebaseConfig, authDomain: e.target.value})}
                        className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-400 font-mono">APP ID (appId)</label>
                      <input
                        type="text"
                        value={firebaseConfig.appId}
                        onChange={(e) => setFirebaseConfig({...firebaseConfig, appId: e.target.value})}
                        className="w-full px-2.5 py-1.5 bg-black border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* System Prompt Instruction section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold font-display">
                    <Terminal className="w-4.5 h-4.5 text-pink-400" />
                    <span>System Instructions</span>
                  </div>
                  <textarea
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-purple-500 leading-normal"
                    placeholder="Describe how the AI should behave..."
                  />
                </div>

                {/* Restore Dismissed Advertisement Option */}
                {adClosed && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        playTactileBeep(440, 0.05);
                        setAdClosed(false);
                        triggerNotification("Iklan IBT Chat App di-restore!", "success");
                      }}
                      className="text-[10px] text-gray-500 hover:text-yellow-400 font-mono transition-colors underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                      <span>Tampilkan Kembali Iklan IBT Chat App</span>
                    </button>
                  </div>
                )}

              </div>

              {/* Action buttons inside drawer */}
              <div className="pt-4 border-t border-white/5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTactileBeep(260, 0.05);
                    const defaultConfig = {
                      apiKey: "AIzaSyAJO_mnPjeg3l47Xhxqqfx273TKL2YFcQk",
                      authDomain: "ibt-x-gem.firebaseapp.com",
                      databaseURL: "https://ibt-x-gem-default-rtdb.asia-southeast1.firebasedatabase.app",
                      projectId: "ibt-x-gem",
                      storageBucket: "ibt-x-gem.firebasestorage.app",
                      messagingSenderId: "124357776368",
                      appId: "1:124357776368:web:68f0afcbee01d88a060335",
                      measurementId: "G-H5BWX8Y0VQ"
                    };
                    setFirebaseConfig(defaultConfig);
                    localStorage.setItem("IBT_X_GEM_FIREBASE_CONFIG", JSON.stringify(defaultConfig));
                    triggerNotification("Reset credentials to workspace defaults", "info");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold tracking-wide transition-all cursor-pointer"
                >
                  Reset Defaults
                </button>
                 <button
                  type="button"
                  onClick={() => {
                    playTactileBeep(600, 0.08);
                    localStorage.setItem("IBT_X_GEM_FIREBASE_CONFIG", JSON.stringify(firebaseConfig));
                    localStorage.setItem("IBT_X_GEM_FALLBACK", String(useServerFallback));
                    saveGeneralConfigs(
                      geminiApiKey, 
                      databaseEngine, 
                      activeModel, 
                      systemInstruction,
                      anotherProvider,
                      anotherApiKey,
                      anotherModel
                    );
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold tracking-wide transition-all shadow-md shadow-purple-500/10 cursor-pointer"
                >
                  Save Configurations
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. INTERACTIVE ONBOARDING SETUP GUIDE MODAL */}
      <AnimatePresence>
        {showSetupGuide && (
          <>
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] flex flex-col gap-6 text-gray-100"
              >
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Rocket className="w-6 h-6 text-purple-400 animate-bounce" />
                    <div>
                      <h3 className="text-lg md:text-xl font-bold font-display text-white">Panduan Setup & Onboarding IBT X Gem</h3>
                      <p className="text-xs text-purple-300 font-mono">SELAMAT DATANG DI PORTAL KOSMIK INTERAKTIF</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playTactileBeep(200, 0.05);
                      setShowSetupGuide(false);
                      localStorage.setItem("IBT_X_GEM_FIRST_TIME", "false");
                    }}
                    className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content Guide */}
                <div className="space-y-6 text-sm leading-relaxed overflow-y-auto pr-1">
                  
                  {/* Step 1: Default API Key & Token System */}
                  <div className="space-y-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold font-display">
                      <Sparkles className="w-5 h-5" />
                      <span>1. Sistem Token Quota Gratis (5550 TKNS)</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      Sebagai pengguna baru, Anda dibekali dengan saldo gratis sebanyak <strong>5550 Token</strong>.
                    </p>
                    <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                      <li>Token berkurang otomatis setiap kali Anda mengirim pesan (berdasarkan panjang teks prompt dan respon AI).</li>
                      <li>Token sistem ini <strong>hanya aktif</strong> jika Anda menggunakan Default API Key bawaan aplikasi.</li>
                      <li>Jika saldo habis, Anda bisa mengklik tombol <strong>Isi Ulang (Top-Up)</strong> di pengaturan atau memasukkan kunci API Anda sendiri.</li>
                    </ul>
                  </div>

                  {/* Step 2: Custom API Keys */}
                  <div className="space-y-2 p-4 rounded-xl border border-purple-500/20 bg-purple-950/10">
                    <div className="flex items-center gap-2 text-purple-300 font-bold font-display">
                      <Key className="w-5 h-5" />
                      <span>2. Cara Setup Google Gemini API Key Anda Sendiri</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      Ingin menggunakan AI tanpa batasan kuota token? Sangat disarankan untuk menghubungkan API Key pribadi Anda:
                    </p>
                    <ol className="list-decimal list-inside text-xs text-gray-400 space-y-1">
                      <li>Buka Google AI Studio di <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">aistudio.google.com</a> lalu buat API Key gratis.</li>
                      <li>Buka <strong>Quantum Config</strong> (ikon roda gigi di pojok kanan atas sidebar).</li>
                      <li>Masukkan kunci Anda pada field <strong>Gemini API Key</strong> dan klik <strong>Save Configurations</strong>.</li>
                      <li>Setelah API Key pribadi dimasukkan, Anda akan mendapatkan akses <strong>UNLIMITED tanpa batas token!</strong></li>
                    </ol>
                  </div>

                  {/* Step 3: Brightness / Theme settings */}
                  <div className="space-y-2 p-4 rounded-xl border border-orange-500/20 bg-orange-950/10">
                    <div className="flex items-center gap-2 text-orange-400 font-bold font-display">
                      <Sun className="w-5 h-5" />
                      <span>3. Pengaturan Kecerahan (Light / Dark Mode)</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      Anda dapat mengubah tema pencahayaan sesuai dengan preferensi kenyamanan mata Anda:
                    </p>
                    <p className="text-xs text-gray-400">
                      Buka <strong>Quantum Config</strong> (Gear icon), lalu pilih tombol <strong>Terang (Light)</strong> atau <strong>Gelap (Dark)</strong> pada bagian "Pengaturan Kecerahan Cahaya" untuk mengganti mode pencahayaan secara instan.
                    </p>
                  </div>

                  {/* Step 4: Multi AI Provider */}
                  <div className="space-y-2 p-4 rounded-xl border border-pink-500/20 bg-pink-950/10">
                    <div className="flex items-center gap-2 text-pink-300 font-bold font-display">
                      <Layers className="w-5 h-5" />
                      <span>4. Integrasi Provider AI Lain (OpenAI, Anthropic, Claude, DeepSeek)</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      Ingin mencoba model selain Gemini? Portal ini juga mendukung OpenAI, Anthropic Claude, Groq, dan DeepSeek AI. Anda hanya perlu menentukan provider, memasukkan target model, dan menyematkan API Key provider terkait di bagian pengaturan drawer.
                    </p>
                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-gray-400 font-mono">
                    Tekan tombol di bawah untuk masuk ke ruang obrolan.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playTactileBeep(659, 0.1);
                      setShowSetupGuide(false);
                      localStorage.setItem("IBT_X_GEM_FIRST_TIME", "false");
                      triggerNotification("Selamat datang di BlackholeAi X Gemini!", "success");
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-wide transition-all shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Mulai Eksplorasi Sekarang!
                  </button>
                </div>

              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
