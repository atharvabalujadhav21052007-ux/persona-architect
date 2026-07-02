import React, { useState, useRef } from "react";
import AnimatedAvatar from "./components/AnimatedAvatar";
import {
  Sparkles,
  Camera,
  Brain,
  Volume2,
  Cpu,
  ArrowRight,
  Check,
  Upload,
  RefreshCw,
  Send,
  Copy,
  Bot,
  MessageSquare,
  AlertCircle,
  Edit,
  Sliders
} from "lucide-react";
import { VisualProfile, PersonalityAnswers, Message } from "./types";

export default function App() {
  // Current active Phase tab: 1, 2, 3, or 4
  const [activePhase, setActivePhase] = useState<number>(1);
  const [highestPhaseUnlocked, setHighestPhaseUnlocked] = useState<number>(1);

  // Phase 1 State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [visualProfile, setVisualProfile] = useState<VisualProfile | null>(null);
  const [visualAdjustments, setVisualAdjustments] = useState<string>("");
  const [showVisualAdjustForm, setShowVisualAdjustForm] = useState<boolean>(false);
  const [phase1Status, setPhase1Status] = useState<string>("");

  // Phase 2 State
  const [answers, setAnswers] = useState<PersonalityAnswers>({
    personality: "A highly analytical yet casual thinker. Slightly dry humor, tech-oriented, introverted but comfortable sharing opinions.",
    style: "Casual, standard developer slang, lowercase or short punchy sentences, using key words like 'neat', 'makes sense', 'actually'.",
    interests: "Software engineering, building full-stack products, deep learning, coffee, clean UI design, sci-fi movies.",
    behavior: "Responds to roasts with witty, self-deprecating humor. Focuses on pragmatic, elegant solutions when asked technical questions."
  });
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [personaHeadline, setPersonaHeadline] = useState<string>("");
  const [personaDescription, setPersonaDescription] = useState<string>("");
  const [isPromptEditable, setIsPromptEditable] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Phase 3 State
  const [voiceStability, setVoiceStability] = useState<number>(0.75);
  const [voiceClarity, setVoiceClarity] = useState<number>(0.85);
  const [voiceStyleExaggeration, setVoiceStyleExaggeration] = useState<number>(0.15);
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<string>("ElevenLabs Multilingual v2");

  // Phase 4 State
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hey there! I am your AI digital twin. Once you synthesize my personality, you can chat with me here to see how accurate I sound!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatSending, setIsChatSending] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Unlock a phase
  const unlockPhase = (phase: number) => {
    if (phase > highestPhaseUnlocked) {
      setHighestPhaseUnlocked(phase);
    }
    setActivePhase(phase);
  };

  // Phase 1 Actions
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setImageMimeType(file.type);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
          setImageMimeType(file.type);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAnalyzeImage = async () => {
    if (!imageSrc) return;
    setIsAnalyzing(true);
    setPhase1Status("Decoding visual features...");
    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc, mimeType: imageMimeType })
      });
      if (!response.ok) {
        throw new Error("Failed to analyze image with the AI.");
      }
      const data = await response.json();
      setVisualProfile(data);
      setPhase1Status("Aesthetic profile successfully unlocked!");
    } catch (err: any) {
      console.error(err);
      setPhase1Status(`Error: ${err.message || "Something went wrong."}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveVisualAdjustments = () => {
    if (visualProfile && visualAdjustments.trim()) {
      setVisualProfile({
        ...visualProfile,
        summary: `${visualProfile.summary} Note: ${visualAdjustments}`
      });
      setVisualAdjustments("");
      setShowVisualAdjustForm(false);
    }
  };

  // Phase 2 Actions
  const triggerGeneratePrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const response = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, visualProfile })
      });
      if (!response.ok) {
        throw new Error("Failed to generate brain blueprint.");
      }
      const data = await response.json();
      setGeneratedPrompt(data.systemPrompt);
      setPersonaHeadline(data.headline);
      setPersonaDescription(data.description);
      // Reset playground chat with custom intro
      setChatMessages([
        {
          id: "sys-init",
          role: "model",
          content: `Digital Twin [${data.headline}] initialized. "Ask me anything, let's see if I talk like you."`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Phase 4 Actions
  const [currentBotText, setCurrentBotText] = useState("");
  const [currentBotAudio, setCurrentBotAudio] = useState("");

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatSending) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          systemPrompt: generatedPrompt,
          visualProfile
        })
      });
      if (!response.ok) {
        throw new Error("Chat service returned an error.");
      }
      const data = await response.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setCurrentBotText(data.content);
      if (data.audio) setCurrentBotAudio(data.audio);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: "Oops! My thinking core hit a snag. Ensure you completed Phase 2 and have valid environment variables configured.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-[#1e293b] bg-[#0f172a]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-100 to-indigo-300 bg-clip-text text-transparent">
                AI Clone Architect
              </h1>
              <p className="text-xs text-gray-400">Deploy your highly accurate Digital Twin</p>
            </div>
          </div>

          {/* Quick Stats or Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e293b]/50 border border-[#334155]/60">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-gray-300 font-mono">Workspace Ready</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Phase Stepper Navigation */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="p-4 bg-[#0f172a] border border-[#1e293b] rounded-2xl">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
              Architect Roadmap
            </h2>
            <div className="flex flex-col gap-2">
              {/* Phase 1 Button */}
              <button
                onClick={() => setActivePhase(1)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 text-left ${
                  activePhase === 1
                    ? "bg-indigo-600/25 border border-indigo-500 text-white"
                    : "bg-[#131b2e] border border-[#1e293b] text-gray-300 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${activePhase === 1 ? "bg-indigo-500" : "bg-[#1e293b]"}`}>
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-indigo-300 font-mono">PHASE 1</div>
                    <div className="text-sm font-medium">Visual Identity</div>
                  </div>
                </div>
                {visualProfile && <Check className="w-5 h-5 text-emerald-400" />}
              </button>

              {/* Phase 2 Button */}
              <button
                onClick={() => {
                  if (highestPhaseUnlocked >= 2) setActivePhase(2);
                }}
                disabled={highestPhaseUnlocked < 2}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 text-left ${
                  highestPhaseUnlocked < 2
                    ? "opacity-50 cursor-not-allowed bg-gray-900/10 border border-gray-800"
                    : activePhase === 2
                    ? "bg-indigo-600/25 border border-indigo-500 text-white"
                    : "bg-[#131b2e] border border-[#1e293b] text-gray-300 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${activePhase === 2 ? "bg-indigo-500" : "bg-[#1e293b]"}`}>
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-indigo-300 font-mono">PHASE 2</div>
                    <div className="text-sm font-medium">Brain Blueprint</div>
                  </div>
                </div>
                {generatedPrompt && <Check className="w-5 h-5 text-emerald-400" />}
              </button>

              {/* Phase 3 Button */}
              <button
                onClick={() => {
                  if (highestPhaseUnlocked >= 3) setActivePhase(3);
                }}
                disabled={highestPhaseUnlocked < 3}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 text-left ${
                  highestPhaseUnlocked < 3
                    ? "opacity-50 cursor-not-allowed bg-gray-900/10 border border-gray-800"
                    : activePhase === 3
                    ? "bg-indigo-600/25 border border-indigo-500 text-white"
                    : "bg-[#131b2e] border border-[#1e293b] text-gray-300 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${activePhase === 3 ? "bg-indigo-500" : "bg-[#1e293b]"}`}>
                    <Volume2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-indigo-300 font-mono">PHASE 3</div>
                    <div className="text-sm font-medium">Voice Profile</div>
                  </div>
                </div>
                {highestPhaseUnlocked > 3 && <Check className="w-5 h-5 text-emerald-400" />}
              </button>

              {/* Phase 4 Button */}
              <button
                onClick={() => {
                  if (highestPhaseUnlocked >= 4) setActivePhase(4);
                }}
                disabled={highestPhaseUnlocked < 4}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 text-left ${
                  highestPhaseUnlocked < 4
                    ? "opacity-50 cursor-not-allowed bg-gray-900/10 border border-gray-800"
                    : activePhase === 4
                    ? "bg-indigo-600/25 border border-indigo-500 text-white"
                    : "bg-[#131b2e] border border-[#1e293b] text-gray-300 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${activePhase === 4 ? "bg-indigo-500" : "bg-[#1e293b]"}`}>
                    <Cpu className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-indigo-300 font-mono">PHASE 4</div>
                    <div className="text-sm font-medium">Live Twin Core</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#0f172a] border border-[#1e293b] rounded-2xl text-xs text-gray-400 space-y-2">
            <span className="font-semibold text-gray-300 block">How to use:</span>
            <p>1. Upload a portrait image to extract visual details.</p>
            <p>2. Fill in the personality questionnaires to craft your unique brain blueprint.</p>
            <p>3. Align voice attributes and practice scripts.</p>
            <p>4. Securely chat with your completed digital twin or get code to export.</p>
          </div>
        </div>

        {/* Right column: Dynamic Content Panel based on active Phase */}
        <div className="lg:col-span-9 space-y-6">

          {/* PHASE 1 PANEL */}
          {activePhase === 1 && (
            <div className="p-6 bg-[#0f172a] border border-[#1e293b] rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-400" /> Phase 1: Visual & Aesthetic Analysis
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Upload an image of yourself. AI will analyze physical attributes, style aesthetic, posture, and facial vibe to seed the visual baseline for your twin.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Upload & Drag/Drop area */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all min-h-[260px] ${
                    imageSrc
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-[#334155] bg-[#131b2e] hover:border-indigo-500/50"
                  }`}
                >
                  {imageSrc ? (
                    <div className="space-y-4 w-full">
                      <div className="relative w-40 h-40 mx-auto rounded-xl overflow-hidden border border-[#334155] shadow-lg">
                        <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            setImageSrc(null);
                            setVisualProfile(null);
                          }}
                          className="absolute bottom-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 font-mono truncate max-w-xs mx-auto">
                        Image ready for analysis
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="p-3 bg-[#1e293b] rounded-full inline-block">
                        <Upload className="w-6 h-6 text-indigo-400" />
                      </div>
                      <p className="text-sm text-gray-200 font-medium">Drag & drop your portrait here, or click to browse</p>
                      <p className="text-xs text-gray-400">Supports PNG, JPG, or WEBP up to 10MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Analysis Console */}
                <div className="bg-[#131b2e] rounded-xl p-5 border border-[#1e293b] flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Analysis Status
                    </h4>

                    {phase1Status && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/60 text-xs">
                        <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="text-indigo-200">{phase1Status}</span>
                      </div>
                    )}

                    {!visualProfile && !isAnalyzing && (
                      <p className="text-xs text-gray-400">
                        Upload an image on the left and click "Analyze Physical Aesthetic" to start extracting character dimensions.
                      </p>
                    )}

                    {isAnalyzing && (
                      <div className="space-y-2 py-4">
                        <div className="flex justify-between text-xs text-gray-400 font-mono">
                          <span>Synthesizing multi-modal characteristics...</span>
                          <span className="animate-pulse text-indigo-400">PROCESSING</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 animate-[pulse_1.5s_infinite] w-3/4 rounded-full"></div>
                        </div>
                      </div>
                    )}

                    {visualProfile && (
                      <div className="space-y-3">
                        <div className="p-3 bg-[#1e293b]/60 rounded-lg border border-[#334155]/40 text-xs">
                          <span className="font-semibold text-indigo-300 block mb-1">Visual Aura Checklist:</span>
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Physical attributes mapped
                          </span>
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5 mt-1">
                            <Check className="w-3.5 h-3.5" /> Style & vibe vectors identified
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={triggerAnalyzeImage}
                    disabled={!imageSrc || isAnalyzing}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                      !imageSrc || isAnalyzing
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20 hover:opacity-90"
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Portrait...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Analyze Physical Aesthetic
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Analyzed Results Displays */}
              {visualProfile && (
                <div className="border-t border-[#1e293b] pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Extracted Visual Identity Core
                    </h4>
                    <button
                      onClick={() => setShowVisualAdjustForm(!showVisualAdjustForm)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Adjust visual traits
                    </button>
                  </div>

                  {showVisualAdjustForm && (
                    <div className="p-4 bg-[#131b2e] border border-indigo-900/40 rounded-xl space-y-3">
                      <label className="text-xs text-indigo-300 font-medium block">
                        Add any personal corrections (e.g. "Actually, I wear gold-rimmed glasses and look slightly more energetic than professional")
                      </label>
                      <textarea
                        value={visualAdjustments}
                        onChange={(e) => setVisualAdjustments(e.target.value)}
                        className="w-full text-sm bg-[#0b0f19] border border-[#334155] rounded-lg p-2.5 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Type adjustments here..."
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowVisualAdjustForm(false)}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveVisualAdjustments}
                          className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                        >
                          Apply Adjustments
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-1.5">
                      <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Appearance & Style</span>
                      <p className="text-sm text-gray-200 leading-relaxed">{visualProfile.appearance}</p>
                    </div>
                    <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-1.5">
                      <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Facial Mood & Vibe</span>
                      <p className="text-sm text-gray-200 leading-relaxed">{visualProfile.vibe}</p>
                    </div>
                    <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-1.5">
                      <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Posture & Presence</span>
                      <p className="text-sm text-gray-200 leading-relaxed">{visualProfile.posture}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#1a2035]/60 border border-indigo-900/30 rounded-xl">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block mb-1">Aesthetic Aura Summary</span>
                    <p className="text-sm text-gray-100 italic">"{visualProfile.summary}"</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => unlockPhase(2)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/10 transition-all"
                    >
                      Proceed to Phase 2 <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHASE 2 PANEL */}
          {activePhase === 2 && (
            <div className="p-6 bg-[#0f172a] border border-[#1e293b] rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-400" /> Phase 2: Character, Personality & Tone Blueprint
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Tune the cognitive parameters of your digital twin. Fill in your traits below to configure your custom AI brain mapping.
                </p>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                    1. Core Personality
                  </label>
                  <p className="text-xs text-gray-400">Describe humor, introversion level, intellect, and emotional pace.</p>
                  <textarea
                    value={answers.personality}
                    onChange={(e) => setAnswers({ ...answers, personality: e.target.value })}
                    className="w-full text-sm bg-[#131b2e] border border-[#1e293b] focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-gray-100"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                    2. Vocabulary & Speech Cadence
                  </label>
                  <p className="text-xs text-gray-400">Mention key phrases, slangs, casing preferences, and response length.</p>
                  <textarea
                    value={answers.style}
                    onChange={(e) => setAnswers({ ...answers, style: e.target.value })}
                    className="w-full text-sm bg-[#131b2e] border border-[#1e293b] focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-gray-100"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                    3. Knowledge Base & Interests
                  </label>
                  <p className="text-xs text-gray-400">What fields are you a master of? What could you lecture on for hours?</p>
                  <textarea
                    value={answers.interests}
                    onChange={(e) => setAnswers({ ...answers, interests: e.target.value })}
                    className="w-full text-sm bg-[#131b2e] border border-[#1e293b] focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-gray-100"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                    4. Behavioral Boundary Constraints
                  </label>
                  <p className="text-xs text-gray-400">How do you handle direct roasts, compliments, or sensitive questions?</p>
                  <textarea
                    value={answers.behavior}
                    onChange={(e) => setAnswers({ ...answers, behavior: e.target.value })}
                    className="w-full text-sm bg-[#131b2e] border border-[#1e293b] focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-gray-100"
                    rows={3}
                  />
                </div>
              </div>

              {/* Synthesize Button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={triggerGeneratePrompt}
                  disabled={isGeneratingPrompt}
                  className="py-3 px-8 bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 hover:opacity-95 flex items-center gap-2"
                >
                  {isGeneratingPrompt ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Synthesizing Persona Map...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" /> Synthesize AI Brain Blueprint
                    </>
                  )}
                </button>
              </div>

              {/* Generated System Prompt Results */}
              {generatedPrompt && (
                <div className="border-t border-[#1e293b] pt-6 space-y-4">
                  <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-cyan-400 tracking-wide uppercase">Compiled Archetype</span>
                        <h4 className="text-base font-bold text-white mt-0.5">{personaHeadline}</h4>
                      </div>
                      <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded border border-indigo-800/30">
                        System Instruction v1.0
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 italic">"{personaDescription}"</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                        Synthesized System Prompt
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPromptEditable(!isPromptEditable)}
                          className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          {isPromptEditable ? "Save" : "Edit"} Prompt
                        </button>
                        <span className="text-gray-600">|</span>
                        <button
                          onClick={() => copyToClipboard(generatedPrompt)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedPrompt ? "Copied!" : "Copy block"}
                        </button>
                      </div>
                    </div>

                    {isPromptEditable ? (
                      <textarea
                        value={generatedPrompt}
                        onChange={(e) => setGeneratedPrompt(e.target.value)}
                        className="w-full text-xs font-mono bg-[#131b2e] border border-indigo-500/50 focus:outline-none rounded-xl p-4 text-gray-200"
                        rows={10}
                      />
                    ) : (
                      <pre className="text-xs font-mono bg-[#131b2e] border border-[#1e293b] rounded-xl p-4 text-gray-300 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
                        {generatedPrompt}
                      </pre>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => unlockPhase(3)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/10 transition-all"
                    >
                      Proceed to Phase 3 <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHASE 3 PANEL */}
          {activePhase === 3 && (
            <div className="p-6 bg-[#0f172a] border border-[#1e293b] rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-indigo-400" /> Phase 3: Voice & Audio Profile Architecture
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Configure custom text-to-speech models, map audio modulation parameters, and utilize professional recording scripts.
                </p>
              </div>

              {/* Recommended Tools Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Top Recommended Voice Cloning Platforms
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-1.5">
                    <span className="text-xs font-semibold text-indigo-300 block">ElevenLabs (Recommended)</span>
                    <p className="text-xs text-gray-400">Best latency, near perfect timbre replication, and simple instant-voice cloning.</p>
                  </div>
                  <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-1.5">
                    <span className="text-xs font-semibold text-indigo-300 block">Bark (Local Open Source)</span>
                    <p className="text-xs text-gray-400">Excellent for fully open-source deployment, supports custom emotion tokens.</p>
                  </div>
                  <div className="p-4 bg-[#131b2e] border border-[#1e293b] rounded-xl space-y-1.5">
                    <span className="text-xs font-semibold text-indigo-300 block">Coqui XTTS v2</span>
                    <p className="text-xs text-gray-400">Allows fine-tuning a local model with as little as 6 seconds of reference audio.</p>
                  </div>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#1e293b] pt-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Voice Modulation Tuning
                  </h4>

                  {/* Stability Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-gray-300">
                      <span>Stability / Monotone</span>
                      <span className="text-indigo-400 font-mono">{(voiceStability * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceStability}
                      onChange={(e) => setVoiceStability(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-[#1e293b] rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-500">
                      Higher values make speech more consistent but might sound robotic if too high.
                    </p>
                  </div>

                  {/* Clarity Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-gray-300">
                      <span>Clarity / Similarity</span>
                      <span className="text-indigo-400 font-mono">{(voiceClarity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceClarity}
                      onChange={(e) => setVoiceClarity(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-[#1e293b] rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-500">
                      Elevates matching closeness to original recordings, potentially amplifying noise artifacts.
                    </p>
                  </div>

                  {/* Style Exaggeration Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-gray-300">
                      <span>Style Exaggeration</span>
                      <span className="text-indigo-400 font-mono">{(voiceStyleExaggeration * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={voiceStyleExaggeration}
                      onChange={(e) => setVoiceStyleExaggeration(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-[#1e293b] rounded-lg cursor-pointer"
                    />
                    <p className="text-[10px] text-gray-500">
                      Amplifies conversational gestures and energetic inflections. Default (15%) is recommended.
                    </p>
                  </div>

                  {/* Model selection */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Base Model Choice</span>
                    <select
                      value={selectedVoiceModel}
                      onChange={(e) => setSelectedVoiceModel(e.target.value)}
                      className="w-full text-xs bg-[#131b2e] border border-[#1e293b] rounded-xl p-2.5 text-gray-200 focus:outline-none"
                    >
                      <option>ElevenLabs Multilingual v2</option>
                      <option>ElevenLabs English v1 (Ultra-realistic)</option>
                      <option>Bark TTS Engine</option>
                      <option>Custom XTTS local wrapper</option>
                    </select>
                  </div>
                </div>

                {/* Professional Reading Script */}
                <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      2-Minute Calibration Script
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                      Optimal Range
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200">
                    Record this with balanced breathing, natural micro-pauses, and standard colloquial vocal speeds:
                  </p>
                  <blockquote className="text-xs text-gray-300 border-l-2 border-indigo-500 pl-3 italic py-1 leading-relaxed max-h-56 overflow-y-auto">
                    "Hey, this is {personaHeadline || "my digital twin"} recording calibration blocks. 
                    We are testing voice modulation, pace dynamics, and phonetic boundaries. 
                    I'm reading with casual energy, avoiding synthetic robotic sounds. 
                    Whether we are discussing technical architectures, roasting codebase patterns, or reviewing simple layout mockups, this clone should project an honest, real presence. 
                    Let's ensure the stability is high enough to be clean, but dynamic enough to catch sarcasm, humor, and authentic thoughts."
                  </blockquote>
                  <p className="text-[10px] text-gray-400">
                    Tip: Keep your mic approximately 6 inches away. Ensure a quiet environment to prevent noise artifacts.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#1e293b]">
                <button
                  onClick={() => unlockPhase(4)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/10 transition-all"
                >
                  Unlock Final Integration <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PHASE 4 PANEL */}
          {activePhase === 4 && (
            <>
              <AnimatedAvatar 
                 imageSrc={imageSrc || "/src/assets/avatar.jpg"} 
                 text={currentBotText} 
                 audioBase64={currentBotAudio} 
              />
              <div className="p-6 bg-[#0f172a] border border-[#1e293b] rounded-2xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-400" /> Phase 4: Final Integration & Live Twin Playground
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Test-chat with your synthesized digital twin in real time, or generate wrapper scripts for your client-side wrappers.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Visual profile, voice summary & Export Python code */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Synthesis Profile Specs</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-[#0b0f19] rounded border border-[#1e293b]">
                          <span className="text-gray-400 block">Archetype</span>
                          <span className="font-semibold text-white truncate block">{personaHeadline || "Unmapped"}</span>
                        </div>
                        <div className="p-2 bg-[#0b0f19] rounded border border-[#1e293b]">
                          <span className="text-gray-400 block">Voice Stability</span>
                          <span className="font-semibold text-white font-mono block">{(voiceStability * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Py Wrapper code block */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                        Python/Node Wrapper Template
                      </span>
                      <pre className="text-[10px] font-mono bg-black/40 border border-[#1e293b] rounded-xl p-3 text-cyan-300 overflow-x-auto max-h-56">
{`# AI CLONE PYTHON RUNTIME WRAPPER
import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

system_prompt = """\${generatedPrompt ? generatedPrompt.substring(0, 100) + "..." : "YOUR_SYSTEM_PROMPT_HERE"}"""

def chat_with_clone(message_history):
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=message_history,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.8,
        ),
    )
    return response.text
`}
                      </pre>
                    </div>
                  </div>

                  {/* Interactive Live Chatbot with Clone */}
                  <div className="lg:col-span-7 flex flex-col h-[400px] border border-[#1e293b] rounded-xl overflow-hidden bg-[#131b2e]">
                    {/* Chat header */}
                    <div className="bg-[#0f172a] px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                          <Bot className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">PLAYGROUND CONSOLE</span>
                          <span className="text-xs font-bold text-white block">
                            {personaHeadline || "Digital Twin Core"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-900/30">
                        Active
                      </span>
                    </div>

                    {/* Message Streams */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-0 text-xs scrollbar-thin">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-xl p-3 space-y-1 ${
                              msg.role === "user"
                                ? "bg-indigo-600 text-white"
                                : "bg-[#0b0f19] border border-[#1e293b] text-gray-200"
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <span className="text-[9px] block text-right opacity-60 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}

                      {isChatSending && (
                        <div className="flex justify-start">
                          <div className="bg-[#0b0f19] border border-[#1e293b] rounded-xl p-3 text-gray-400 flex items-center gap-2">
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                            </span>
                            <span>Digital Twin is drafting thought loops...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive input bar */}
                    <div className="p-3 bg-[#0f172a] border-t border-[#1e293b] flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendChatMessage();
                        }}
                        placeholder={generatedPrompt ? "Send a challenge message to your twin..." : "Synthesize your brain first in Phase 2"}
                        disabled={!generatedPrompt}
                        className="flex-1 bg-[#131b2e] border border-[#1e293b] focus:border-indigo-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim() || isChatSending || !generatedPrompt}
                        className={`p-2 rounded-lg text-white font-medium transition-all ${
                          !chatInput.trim() || isChatSending || !generatedPrompt
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-500"
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Complete Deployment checklist */}
                <div className="p-4 bg-[#1a2035]/30 border border-indigo-900/30 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                    Deployment Blueprint Complete
                  </span>
                  <p className="text-xs text-gray-300">
                    You have successfully analyzed your aesthetics, generated your tone system instructions, configured audio modulation, and tested conversation loops. You are now ready to deploy!
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e293b] bg-[#0b0f19] py-6 px-6 text-center text-xs text-gray-500">
        <p>© 2026 AI Clone Architect. Crafted for authentic digital replica alignment.</p>
      </footer>
    </div>
  );
}
