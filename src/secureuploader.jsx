import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";

const socket = io("http://localhost:3001"); 

const SecureUploader = () => {
  const [files, setFiles] = useState([]); 
  const [receivedFiles, setReceivedFiles] = useState([]); 
  const [status, setStatus] = useState("idle"); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDestroying, setIsDestroying] = useState(false);
  const fileInputRef = useRef(null);

  // --- DYNAMIC ROOM EXTRACTION ---
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "GUEST_SESSION"; 
  const isCustomer = !!params.get("room");
  const displayId = roomId.replace("SHOP_", "");

  const shopUrl = `http://10.145.50.165:5173?room=${roomId}`; 

  useEffect(() => {
    if (!isCustomer) {
      socket.emit("join-room", roomId); 
      socket.on("receive-file", (data) => {
        setReceivedFiles(prev => [...prev, data]);
        setIsDestroying(false);
      });
    }
    return () => socket.off("receive-file");
  }, [isCustomer, roomId]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newFile = { 
          id: Math.random().toString(36).substr(2, 9),
          name: file.name, 
          type: file.type, 
          content: reader.result, 
          size: (file.size / 1024 / 1024).toFixed(2) 
        };
        setFiles(prev => [...prev, newFile]);
        setStatus("ready");
      };
      reader.readAsDataURL(file);
    });
  };

  // --- NEW: REMOVE SINGLE FILE ---
  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (files.length <= 1) setStatus("idle");
  };

  const sendAllFiles = () => {
    if (files.length === 0) return;
    setStatus("uploading");
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        files.forEach(file => {
          socket.emit("send-file", { room: roomId, file: file });
        });
        setStatus("success");
        setFiles([]); 
      }
    }, 100);
  };

  const clearAllReceived = () => {
    setIsDestroying(true);
    setTimeout(() => {
      setReceivedFiles([]);
      setIsDestroying(false);
    }, 1000);
  };

  // ---------------------------------------------------------
  // VIEW 1: SHOPKEEPER COMMAND CENTER (Laptop)
  // ---------------------------------------------------------
  if (!isCustomer) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
        <header className="flex items-center px-8 py-5 border-b border-white/5 bg-slate-900 shadow-xl">
          <h1 className="text-xl font-black tracking-tighter italic text-white uppercase">GHOSTBRIDGE</h1>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <aside className="w-80 border-r border-white/5 p-8 flex flex-col bg-slate-900/50">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4 italic text-cyan-400">STATION ID: #{displayId}</h2>
            <div className="bg-white p-4 rounded-lg inline-block self-start shadow-xl border border-cyan-500/50 mb-8">
              <QRCodeSVG value={shopUrl} size={140} />
            </div>
            
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4">INCOMING QUEUE</p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
               {receivedFiles.map((f) => (
                 <div key={f.id} className="p-3 rounded-lg border border-cyan-500/30 bg-slate-800 text-[10px] font-bold uppercase flex justify-between items-center">
                   <span className="truncate w-32">{f.name}</span>
                   <span className="text-green-500">READY</span>
                 </div>
               ))}
               {receivedFiles.length === 0 && <p className="text-[10px] text-slate-700 italic">Waiting for stream...</p>}
            </div>
          </aside>

          <section className="flex-1 p-12 overflow-y-auto bg-slate-950">
            {receivedFiles.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-[10px]">Uploaded documents display here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {receivedFiles.map((file) => (
                  <div key={file.id} className="bg-slate-900 rounded-2xl border border-white/10 p-8 shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="text-4xl">📄</div>
                        <div className="truncate text-sm font-bold">{file.name}</div>
                    </div>
                    <a href={file.content} download={file.name} className="block bg-white text-black py-3 rounded-lg font-bold text-[10px] uppercase text-center">Download</a>
                  </div>
                ))}
                <div className="col-span-full mt-8 border-t border-white/5 pt-8">
                   <button onClick={clearAllReceived} className="w-full bg-red-500/10 text-red-500 border border-red-500/20 py-4 rounded-xl font-bold uppercase tracking-widest text-xs">{isDestroying ? "Purging..." : "Destroy All"}</button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------
  // VIEW 2: CUSTOMER MOBILE UI
  // ---------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col font-sans p-6 overflow-hidden">
      <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-white/5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-xs">🛡️</div>
          <div>
            <p className="text-[10px] font-bold text-white uppercase">Connected to: Shop #{displayId}</p>
            <p className="text-[8px] text-green-500 font-bold uppercase tracking-widest">● Secure Link Active</p>
          </div>
        </div>
      </div>

      {status === "success" ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center">
           <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20 text-2xl">✓</div>
           <h2 className="text-xl font-bold mb-2">All files uploaded successfully</h2>
           <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-slate-900 border border-white/10 rounded-full text-[10px] uppercase font-bold text-cyan-400">New Transfer</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative shrink-0 h-[30vh] rounded-[2rem] border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center p-6 mb-6">
              <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current.click()} className="bg-cyan-600 px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-lg">
                {files.length > 0 ? "Add More" : "Select Files"}
              </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Active Transfers</h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 custom-scrollbar">
              {files.map((file) => (
                <div key={file.id} className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div className="max-w-[120px]">
                      <p className="text-[10px] font-bold uppercase truncate">{file.name}</p>
                      <p className="text-[8px] text-slate-500">{file.size} MB</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {status === "uploading" ? (
                      <span className="text-[8px] font-bold text-cyan-500">{uploadProgress}%</span>
                    ) : (
                      <button 
                        onClick={() => removeFile(file.id)}
                        className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {files.length > 0 && status !== "uploading" && (
              <button onClick={sendAllFiles} className="w-full py-5 bg-cyan-600 rounded-2xl font-black text-white text-sm uppercase tracking-widest shadow-xl mb-4">
                Beam {files.length} {files.length === 1 ? 'File' : 'Files'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureUploader;