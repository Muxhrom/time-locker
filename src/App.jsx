import React, { useState, useEffect, useRef } from 'react';
import { Upload, Clock, Lock, Unlock, Download, RefreshCw, Zap, Disc, FileHeart, ShieldAlert, X, Fingerprint, AlertTriangle, Skull, Gamepad2, Siren, CheckCircle2, RotateCw, Ban, Save, Dna } from 'lucide-react';

// --- 安全核心层 ---
const APP_SECRET_KEY = "OMEGA-PROTOCOL-V2-BINDING-KEY-9923-X";

const SecurityLayer = {
  encrypt: (text) => {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(text);
    const keyBytes = encoder.encode(APP_SECRET_KEY);
    const encryptedBytes = dataBytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
    let binary = '';
    for (let i = 0; i < encryptedBytes.byteLength; i++) {
      binary += String.fromCharCode(encryptedBytes[i]);
    }
    return btoa(binary);
  },
  decrypt: (encryptedBase64) => {
    try {
      const binary = atob(encryptedBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(APP_SECRET_KEY);
      const decryptedBytes = bytes.map((byte, i) => byte ^ keyBytes[i % keyBytes.length]);
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBytes);
    } catch (e) {
      throw new Error("Security Signature Mismatch");
    }
  }
};

// --- 确定性伪随机数生成器 (PRNG) ---
// 线性同余生成器，保证同一种子必定生成同一序列
const pseudoRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

// --- 缓动函数 ---
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

// --- 轮盘小游戏组件 ---
const RouletteGame = ({ onComplete, onClose, remainingAttempts, entropySeed }) => {
  const canvasRef = useRef(null);
  
  const [gameState, setGameState] = useState('idle'); 
  const [resultText, setResultText] = useState(null);
  
  // 动画状态
  const rotationRef = useRef(0);
  const animationRef = useRef();
  const startTimeRef = useRef(0);
  const startRotationRef = useRef(0);
  const targetRotationRef = useRef(0);

  // 区域定义
  const SECTORS = [
    { color: '#ef4444', label: '+60分', value: 60 * 60 * 1000, angle: 75, textCol: '#fff' }, 
    { color: '#f97316', label: '+30分', value: 30 * 60 * 1000, angle: 65, textCol: '#fff' }, 
    { color: '#fbbf24', label: '+10分', value: 10 * 60 * 1000, angle: 55, textCol: '#000' }, 
    { color: '#fde047', label: '+1分',  value: 1 * 60 * 1000,  angle: 50, textCol: '#000' }, 
    { color: '#bef264', label: '-10分', value: -10 * 60 * 1000, angle: 45, textCol: '#000' }, 
    { color: '#4ade80', label: '-30分', value: -30 * 60 * 1000, angle: 40, textCol: '#000' }, 
    { color: '#22d3ee', label: '-60分', value: -60 * 60 * 1000, angle: 30, textCol: '#000' }, 
  ];

  // 绘制轮盘 (静态背景)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 300;
    const center = size / 2;
    const radius = size / 2 - 10;

    canvas.width = size;
    canvas.height = size;

    let startAngle = 0;
    const degToRad = (deg) => (deg * Math.PI) / 180;

    SECTORS.forEach(sector => {
      const sliceAngle = degToRad(sector.angle);
      
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
      ctx.fillStyle = sector.color;
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = sector.textCol;
      ctx.font = "bold 14px monospace";
      ctx.fillText(sector.label, radius - 20, 5);
      ctx.restore();

      startAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#334155';
    ctx.stroke();
  }, []);

  // 渲染当前角度到 DOM
  const renderRotation = (deg) => {
    const wheelElement = document.getElementById('roulette-wheel');
    if (wheelElement) {
        wheelElement.style.transform = `rotate(${deg}deg)`;
    }
  };

  // 核心动画循环 (基于时间)
  const animate = (time) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const elapsed = time - startTimeRef.current;
    const duration = 5000; // 5秒旋转时间

    if (elapsed < duration) {
      const progress = elapsed / duration;
      const ease = easeOutCubic(progress);
      
      const currentRot = startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * ease;
      rotationRef.current = currentRot;
      renderRotation(currentRot);
      
      animationRef.current = requestAnimationFrame(animate);
    } else {
      rotationRef.current = targetRotationRef.current;
      renderRotation(targetRotationRef.current);
      
      setGameState('result');
      calculateResult(targetRotationRef.current);
    }
  };

  const handleStart = () => {
    if (gameState !== 'idle') return;
    setGameState('spinning');

    // === 命运演算 ===
    const rng = pseudoRandom(entropySeed);
    
    // 1. 确定最终停止的角度 (0-360)
    const finalAngle = rng() * 360; 
    
    // 2. 计算需要旋转的总圈数 (5圈 + 目标角度)
    const spins = 5; 
    const delta = (360 * spins) + finalAngle;
    
    startRotationRef.current = rotationRef.current;
    targetRotationRef.current = startRotationRef.current + delta;
    startTimeRef.current = 0;

    animationRef.current = requestAnimationFrame(animate);
  };

  // 计算结果
  const calculateResult = (finalRot) => {
    const normalizeRot = finalRot % 360;
    const pointerAngleOnWheel = (270 - normalizeRot + 360) % 360;
    
    let currentAngle = 0;
    let hitSector = null;

    for (let sector of SECTORS) {
      if (pointerAngleOnWheel >= currentAngle && pointerAngleOnWheel < currentAngle + sector.angle) {
        hitSector = sector;
        break;
      }
      currentAngle += sector.angle;
    }

    if (hitSector) {
      setResultText(hitSector);
      setTimeout(() => {
        onComplete(hitSector.value);
      }, 1500);
    }
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-950/95 z-30 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
      <div className="relative">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
        <div 
          id="roulette-wheel"
          style={{ transform: `rotate(${rotationRef.current}deg)` }} 
          className="rounded-full shadow-2xl shadow-purple-500/20 border-4 border-slate-800"
        >
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>

      <div className="h-16 mt-8 flex items-center justify-center w-full">
        {gameState === 'result' && resultText ? (
           <div className={`text-2xl font-black font-mono animate-bounce ${resultText.value > 0 ? 'text-red-500' : 'text-green-400'}`}>
              {resultText.value > 0 ? `警报: 时间增加 ${resultText.label}` : `骇入成功: 时间减少 ${resultText.label.replace('-','')}`}
           </div>
        ) : (
           <div className="text-slate-500 font-mono text-sm flex flex-col items-center">
              <div>剩余尝试次数: <span className="text-white font-bold">{remainingAttempts}</span></div>
              <div className="text-[10px] text-purple-500/50 mt-1 flex items-center">
                <Dna className="w-3 h-3 mr-1"/> 
                命运因子: #{entropySeed % 9999}
              </div>
           </div>
        )}
      </div>

      <div className="w-full max-w-xs space-y-3">
        {gameState !== 'result' && (
          <button 
            onClick={handleStart}
            disabled={gameState === 'spinning'}
            className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-lg ${
              gameState === 'idle' 
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:scale-105 text-white shadow-pink-500/30' 
                : 'bg-red-600/50 text-white/50 cursor-not-allowed animate-pulse'
            }`}
          >
            {gameState === 'idle' ? '启动命运轮盘' : '命运演算中...'}
          </button>
        )}
        
        <button onClick={onClose} disabled={gameState === 'spinning'} className="w-full py-2 text-xs text-slate-500 hover:text-white transition-colors disabled:opacity-30">
          放弃并返回
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [mode, setMode] = useState('new'); 
  const [imageData, setImageData] = useState(null);
  const [fileName, setFileName] = useState("");
  
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(10);
  
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [status, setStatus] = useState('idle'); 
  const [isTimeLocked, setIsTimeLocked] = useState(false);
  
  const [hasDownloaded, setHasDownloaded] = useState(false); 
  const [showBackupWarning, setShowBackupWarning] = useState(false); 
  const [abortStage, setAbortStage] = useState(0); 
  
  const [showGame, setShowGame] = useState(false);
  const [gameAttempts, setGameAttempts] = useState(5); 
  const [gameCooldownEnd, setGameCooldownEnd] = useState(0); 
  
  const [entropySeed, setEntropySeed] = useState(() => Math.floor(Math.random() * 1000000));

  const fileInputRef = useRef(null);
  const restoreInputRef = useRef(null);
  const requestRef = useRef();
  const abortTimeoutRef = useRef(); 

  const animateTimer = () => {
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    
    setTimeLeftMs(remaining);

    if (gameCooldownEnd > 0 && now > gameCooldownEnd) {
      setGameCooldownEnd(0);
      setGameAttempts(5); 
    }

    if (remaining > 0) {
      requestRef.current = requestAnimationFrame(animateTimer);
    } else {
      setStatus('revealed');
      setShowGame(false); 
    }
  };

  useEffect(() => {
    if (status === 'running') {
      requestRef.current = requestAnimationFrame(animateTimer);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, endTime, gameCooldownEnd]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageData(e.target.result);
        setFileName(file.name);
        setStatus('ready');
        setIsTimeLocked(false);
        setHasDownloaded(false); 
        setShowBackupWarning(false);
        setGameAttempts(5);
        setGameCooldownEnd(0);
        setEntropySeed(Math.floor(Math.random() * 1000000));
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadBackup = (isMidRun = false) => {
    if (!imageData) return;

    let secondsToSave;

    if (isMidRun) {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      secondsToSave = Math.floor(remaining / 1000);
      if (secondsToSave <= 0) return; 
    } else {
      secondsToSave = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
    }
    
    if (secondsToSave <= 0) { alert("必须先设定有效的时间才能生成契约文件。"); return; }
    
    const backupPayload = JSON.stringify({
      v: 6, 
      n: fileName,
      duration: secondsToSave,
      d: imageData,
      g: { 
        att: gameAttempts,
        cd: gameCooldownEnd,
        seed: entropySeed 
      }
    });

    try {
      const encryptedData = SecurityLayer.encrypt(backupPayload);
      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const prefix = isMidRun ? "MID_RUN_SAVE" : "SECURE_DATA";
      link.download = `${prefix}_${Date.now()}.krypton`; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      if (!isMidRun) {
        setHasDownloaded(true); 
        setShowBackupWarning(false); 
      }
    } catch (e) { alert("加密封印失败，请重试。"); }
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const decryptedString = SecurityLayer.decrypt(content);
          const payload = JSON.parse(decryptedString);
          if (payload.d && payload.duration) {
            setImageData(payload.d);
            setFileName(payload.n || "未知数据");
            let total = payload.duration;
            const h = Math.floor(total / 3600); total %= 3600;
            const m = Math.floor(total / 60); const s = total % 60;
            setHours(h); setMinutes(m); setSeconds(s);
            
            if (payload.g) {
              setGameAttempts(payload.g.att ?? 5);
              setGameCooldownEnd(payload.g.cd ?? 0);
              setEntropySeed(payload.g.seed ?? Math.floor(Math.random() * 1000000));
            } else {
               setGameAttempts(5);
               setGameCooldownEnd(0);
               setEntropySeed(Math.floor(Math.random() * 1000000));
            }

            setIsTimeLocked(true);
            setHasDownloaded(true); 
            setStatus('ready');
            setMode('new'); 
          } else { throw new Error("Invalid payload structure"); }
        } catch (error) { console.error(error); alert("解密失败：文件指纹不匹配或已损坏。"); }
      };
      reader.readAsText(file);
    }
  };

  const handleStartClick = () => {
    const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
    if (totalSeconds <= 0) { alert("请输入有效的时间"); return; }
    if (!hasDownloaded && !isTimeLocked) { setShowBackupWarning(true); return; }
    startTimer(totalSeconds);
  };

  const startTimer = (totalSecondsInput) => {
    const totalSeconds = totalSecondsInput || (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds));
    const now = Date.now();
    const durationMs = totalSeconds * 1000;
    setEndTime(now + durationMs);
    setTimeLeftMs(durationMs);
    setStatus('running');
    setAbortStage(0); 
    setShowBackupWarning(false);
  };

  const handleGameComplete = (timeChangeMs) => {
    setEndTime(prev => prev + timeChangeMs);
    
    const newAttempts = gameAttempts - 1;
    setGameAttempts(newAttempts);

    if (newAttempts <= 0) {
      setGameCooldownEnd(Date.now() + 60 * 60 * 1000); 
    }

    setEntropySeed(prev => (prev * 16807) % 2147483647);

    setShowGame(false);
  };

  const handleAbortClick = () => {
    if (abortStage === 2) { resetSystem(); return; }
    setAbortStage(prev => prev + 1);
    if (abortTimeoutRef.current) clearTimeout(abortTimeoutRef.current);
    abortTimeoutRef.current = setTimeout(() => { setAbortStage(0); }, 3000);
  };

  const resetSystem = () => {
    setStatus('idle'); setImageData(null); setFileName(""); setTimeLeftMs(0);
    setHours(0); setMinutes(0); setSeconds(10);
    setIsTimeLocked(false); setHasDownloaded(false); setShowBackupWarning(false); setAbortStage(0);
    setShowGame(false);
    setGameAttempts(5); setGameCooldownEnd(0);
    setEntropySeed(Math.floor(Math.random() * 1000000));

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (restoreInputRef.current) restoreInputRef.current.value = "";
    if (abortTimeoutRef.current) clearTimeout(abortTimeoutRef.current);
  };

  const formatTimeFull = (ms) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const milliseconds = Math.max(0, Math.floor((ms % 1000) / 10)); 
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    const msStr = milliseconds.toString().padStart(2, '0');
    return { h: hStr, m: mStr, s: sStr, ms: msStr };
  };

  const formatCooldown = (ms) => {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}分${seconds}秒`;
  };

  const gradientText = "bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-blue-400";
  const cardBorder = "border border-slate-700 shadow-[0_0_40px_-10px_rgba(244,114,182,0.15)]";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-pink-500/30 selection:text-pink-100">
      
      <div className="fixed top-20 left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className={`max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden relative transition-all duration-500 ${cardBorder}`}>
        
        {showGame && (
          <RouletteGame 
            onComplete={handleGameComplete} 
            onClose={() => setShowGame(false)} 
            remainingAttempts={gameAttempts}
            entropySeed={entropySeed}
          />
        )}

        {/* 顶部导航 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 animate-pulse"></div>
            {/* 标题改为中文 */}
            <span className={`font-bold tracking-widest text-base ${gradientText}`}>
              绝密档案协议
            </span>
          </div>
          
          <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
            <button 
              onClick={() => setMode('new')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'new' ? 'bg-slate-700 text-pink-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              新建
            </button>
            <button 
              onClick={() => setMode('restore')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'restore' ? 'bg-slate-700 text-blue-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              恢复
            </button>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="p-8 min-h-[420px] flex flex-col items-center justify-center relative">
          
          {mode === 'restore' && status === 'idle' && (
            <div onClick={() => restoreInputRef.current.click()} className="w-full h-64 border-2 border-dashed border-slate-700 hover:border-blue-400/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group bg-slate-800/20 hover:bg-slate-800/40">
              <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/20">
                <FileHeart className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-blue-300 font-medium tracking-wide">读取加密契约</p>
              <p className="text-slate-500 text-xs mt-2">(.krypton 格式)</p>
              <input type="file" ref={restoreInputRef} onChange={handleRestore} className="hidden" accept=".krypton" />
            </div>
          )}

          {mode === 'new' && status === 'idle' && (
            <div onClick={() => fileInputRef.current.click()} className="w-full h-64 border-2 border-dashed border-slate-700 hover:border-pink-400/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group bg-slate-800/20 hover:bg-slate-800/40">
              <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-pink-900/20">
                <Zap className="w-8 h-8 text-pink-400" />
              </div>
              <p className="text-pink-300 font-medium tracking-wide">上传影像</p>
              <p className="text-slate-500 text-xs mt-2">支持 JPG / PNG / GIF</p>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
          )}

          {status === 'ready' && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
              <button onClick={resetSystem} className="absolute right-0 top-0 p-2 text-slate-600 hover:text-red-400 transition-colors" title="清除并返回">
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-blue-500/20 animate-spin-slow"></div>
                   <Disc className={`w-8 h-8 ${isTimeLocked ? 'text-blue-400' : 'text-pink-400'}`} />
                </div>
                <h3 className="mt-3 text-slate-200 font-medium text-sm">{fileName}</h3>
                <div className="flex items-center space-x-1 mt-1">
                   {isTimeLocked ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center">
                        <Lock className="w-3 h-3 mr-1"/> 时长已锁定
                      </span>
                   ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center ${hasDownloaded ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'}`}>
                        {hasDownloaded ? <><Fingerprint className="w-3 h-3 mr-1"/>已备份</> : "等待设定"}
                      </span>
                   )}
                </div>
              </div>
              <div className={`relative p-4 rounded-xl border ${isTimeLocked ? 'bg-slate-900/50 border-blue-900/30' : 'bg-slate-800/30 border-slate-700'} mb-4`}>
                {isTimeLocked && (
                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-0.5 text-[10px] text-blue-400 border border-blue-900/50 rounded-full flex items-center shadow-lg whitespace-nowrap">
                     <ShieldAlert className="w-3 h-3 mr-1" /> 恢复模式禁止修改
                   </div>
                )}
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex flex-col items-center">
                    <input type="number" min="0" disabled={isTimeLocked} style={{ colorScheme: 'dark' }} value={hours} onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))} className={`w-14 bg-transparent text-center text-2xl font-bold outline-none border-b-2 transition-colors ${isTimeLocked ? 'text-slate-500 border-slate-800' : 'text-white border-pink-500/30 focus:border-pink-500'}`} />
                    {/* 时间单位改为中文 */}
                    <span className="text-[10px] text-slate-500 mt-1 font-medium">时</span>
                  </div>
                  <span className="text-xl text-slate-600 pb-4">:</span>
                  <div className="flex flex-col items-center">
                    <input type="number" min="0" disabled={isTimeLocked} style={{ colorScheme: 'dark' }} value={minutes} onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))} className={`w-14 bg-transparent text-center text-2xl font-bold outline-none border-b-2 transition-colors ${isTimeLocked ? 'text-slate-500 border-slate-800' : 'text-white border-pink-500/30 focus:border-pink-500'}`} />
                    <span className="text-[10px] text-slate-500 mt-1 font-medium">分</span>
                  </div>
                  <span className="text-xl text-slate-600 pb-4">:</span>
                  <div className="flex flex-col items-center">
                    <input type="number" min="0" disabled={isTimeLocked} style={{ colorScheme: 'dark' }} value={seconds} onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))} className={`w-14 bg-transparent text-center text-2xl font-bold outline-none border-b-2 transition-colors ${isTimeLocked ? 'text-slate-500 border-slate-800' : 'text-white border-blue-500/30 focus:border-blue-500'}`} />
                    <span className="text-[10px] text-slate-500 mt-1 font-medium">秒</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 relative">
                {showBackupWarning && (
                  <div className="absolute inset-0 bg-slate-900 z-20 flex flex-col items-center justify-center p-4 rounded-lg border border-yellow-600/50 animate-in fade-in zoom-in duration-200">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                    <p className="text-yellow-100 font-bold text-sm">未检测到备份！</p>
                    <p className="text-yellow-500/80 text-[10px] text-center mb-3">关闭浏览器后数据将永久丢失。</p>
                    <div className="flex space-x-2 w-full">
                      <button onClick={() => setShowBackupWarning(false)} className="flex-1 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300">返回下载</button>
                      <button onClick={() => startTimer(null)} className="flex-1 py-2 text-xs bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-600/50 rounded">仍要开始</button>
                    </div>
                  </div>
                )}
                {!isTimeLocked && (
                  <button onClick={() => downloadBackup(false)} className={`w-full py-3 rounded-lg border transition-all flex items-center justify-center text-sm group ${hasDownloaded ? 'border-green-500/30 bg-green-500/5 text-green-400' : 'border-slate-700 hover:border-pink-500/30 hover:bg-pink-500/5 text-slate-400 hover:text-pink-300'}`}>
                    <Fingerprint className="w-4 h-4 mr-2" />
                    {hasDownloaded ? "已生成加密备份" : "生成高强度加密备份"}
                  </button>
                )}
                <button onClick={handleStartClick} className="w-full py-4 rounded-lg bg-gradient-to-r from-pink-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-purple-900/30 transform active:scale-[0.98] transition-all flex items-center justify-center">
                  <Lock className="w-4 h-4 mr-2" />
                  {isTimeLocked ? "解封加密数据" : "开始封印"}
                </button>
              </div>
            </div>
          )}

          {status === 'running' && (
            <div className="flex flex-col items-center justify-center w-full animate-in zoom-in duration-300">
               <div className="relative mb-6">
                 <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                 <Lock className="w-16 h-16 text-slate-200 relative z-10" />
               </div>
               
               <div className="font-mono flex items-baseline space-x-1 tabular-nums">
                  {(() => {
                    const t = formatTimeFull(timeLeftMs);
                    return (
                      <>
                          <div className="flex flex-col items-center"><span className="text-4xl sm:text-5xl font-black text-white">{t.h}</span><span className="text-[10px] text-slate-600">时</span></div>
                          <span className="text-2xl text-slate-600 relative -top-3">:</span>
                          <div className="flex flex-col items-center"><span className="text-4xl sm:text-5xl font-black text-white">{t.m}</span><span className="text-[10px] text-slate-600">分</span></div>
                          <span className="text-2xl text-slate-600 relative -top-3">:</span>
                          <div className="flex flex-col items-center"><span className="text-4xl sm:text-5xl font-black text-white">{t.s}</span><span className="text-[10px] text-slate-600">秒</span></div>
                          <span className="text-2xl text-slate-600 relative -top-3">:</span>
                          <div className="flex flex-col items-center"><span className="text-4xl sm:text-5xl font-black text-red-500">{t.ms}</span><span className="text-[10px] text-red-500/50">毫秒</span></div>
                      </>
                    );
                  })()}
               </div>
               
               <div className="mt-8 w-full px-4">
                  {gameCooldownEnd > 0 ? (
                    <div className="w-full py-3 bg-red-900/20 rounded-lg border border-red-900/50 text-center flex flex-col items-center justify-center">
                      <div className="flex items-center text-red-500 text-xs font-bold mb-1">
                          <Ban className="w-3 h-3 mr-1" /> 系统冷却锁定
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                          {formatCooldown(Math.max(0, gameCooldownEnd - Date.now()))}
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowGame(true)}
                      className="w-full py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/60 rounded-lg text-purple-400 hover:text-purple-300 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <Gamepad2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform"/>
                      启动命运轮盘 ({gameAttempts}/5)
                    </button>
                  )}
                  <p className="text-[9px] text-slate-600 text-center mt-2 flex items-center justify-center">
                      <AlertTriangle className="w-3 h-3 mr-1 text-slate-700"/>
                      警告: 期望值为负，请谨慎操作
                  </p>
               </div>
               
               <div className="w-full px-4 mt-4">
                  <button 
                    onClick={() => downloadBackup(true)} 
                    className="w-full py-3 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-500/60 rounded-lg text-cyan-400 hover:text-cyan-200 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存当前进度 (MID_RUN_SAVE)
                  </button>
                  <p className="text-[9px] text-slate-500 text-center mt-1">
                    注意: 生成包含当前剩余时间的恢复文件
                  </p>
               </div>

               <div className="mt-8 flex items-center space-x-2 px-4 py-2 bg-slate-900/50 rounded-full border border-slate-700/50">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                 {/* 状态改为中文 */}
                 <span className="text-xs text-slate-400 font-mono tracking-widest">安全容器已锁定</span>
               </div>

               <button onClick={handleAbortClick} className={`mt-8 text-xs transition-all border-b pb-0.5 flex items-center ${abortStage === 0 ? 'text-slate-600 hover:text-red-400 border-transparent hover:border-red-400/30' : ''} ${abortStage === 1 ? 'text-yellow-500 font-bold border-yellow-500 animate-pulse' : ''} ${abortStage === 2 ? 'text-red-500 font-black border-red-500 animate-bounce' : ''}`}>
                 {abortStage === 0 && "终止任务"}
                 {abortStage === 1 && <><AlertTriangle className="w-3 h-3 mr-1"/>确定要放弃吗？再次点击确认</>}
                 {abortStage === 2 && <><Skull className="w-3 h-3 mr-1"/>最后警告：数据将销毁！</>}
               </button>
            </div>
          )}

          {status === 'revealed' && imageData && (
            <div className="flex flex-col items-center justify-center w-full animate-in zoom-in duration-500">
               <div className="relative group w-full max-h-[60vh] flex items-center justify-center bg-black/40 rounded-lg overflow-hidden border border-slate-700/50">
                 <img src={imageData} alt="Revealed" className="max-w-full max-h-[400px] object-contain shadow-2xl" />
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-xs text-slate-300 text-center font-mono">{fileName}</p>
                 </div>
               </div>
               <div className="mt-6 flex space-x-3 w-full">
                 <button onClick={resetSystem} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors flex items-center justify-center">
                   <RefreshCw className="w-4 h-4 mr-2" />返回主页
                 </button>
               </div>
            </div>
          )}

        </div>
      </div>
      {/* 底部改为中文 */}
      <div className="fixed bottom-4 text-[10px] text-slate-600 font-mono tracking-widest opacity-50 pointer-events-none">数字保险箱 // V8.0 // 最终部署</div>
    </div>
  );
}