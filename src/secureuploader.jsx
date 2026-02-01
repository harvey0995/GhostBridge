import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";

const socket = io("http://192.168.207.165:3000");

const SecureUploader = () => {
  const [files, setFiles] = useState([]); 
  const [receivedFiles, setReceivedFiles] = useState([]); 
  const [status, setStatus] = useState("idle"); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperSaver, setPaperSaver] = useState(false); 
  const fileInputRef = useRef(null);

  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("room") || "SHOP_1234"; 
  const isCustomer = !!params.get("room");
  const displayId = roomId.replace("SHOP_", "");
  const shopUrl = `http://192.168.207.165:5173?room=${roomId}`; 

  useEffect(() => {
    if (!isCustomer) {
      socket.emit("join-room", roomId); 
      socket.on("receive-file", (data) => {
        fetch(data.content)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            setReceivedFiles(prev => [...prev, { ...data, blobUrl }]);
            setPrintSuccess(false); 
          });
      });
    }
    return () => socket.off("receive-file");
  }, [isCustomer, roomId]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFiles(prev => [...prev, { 
          id: Math.random().toString(36).substr(2, 9),
          name: file.name, type: file.type, content: reader.result, 
          size: (file.size / 1024 / 1024).toFixed(2)
        }]);
        setStatus("ready");
      };
      reader.readAsDataURL(file);
    });
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
        files.forEach(f => socket.emit("send-file", { room: roomId, file: f }));
        setTimeout(() => {
          setStatus("success");
          setFiles([]);
          setUploadProgress(0);
        }, 500);
      }
    }, 50);
  };

  const resetStation = () => {
    receivedFiles.forEach(file => URL.revokeObjectURL(file.blobUrl));
    setReceivedFiles([]); 
    setPrintSuccess(false); 
    setStatus("idle");
  };

  if (!isCustomer) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
        <header className="flex items-center px-8 py-5 border-b border-white/5 bg-slate-900 shadow-xl no-print">
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-cyan-500">GHOSTBRIDGE</h1>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <aside className="w-80 border-r border-white/5 p-8 bg-slate-900/50 no-print flex flex-col">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">STATION: #{displayId}</h2>
            <div className="bg-white p-3 rounded-xl mb-8 w-fit inline-flex border-4 border-cyan-500/20 shadow-2xl">
              <QRCodeSVG value={shopUrl} size={160} />
            </div>
            
            {/* PAPER SAVER TOGGLE */}
            <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={paperSaver} 
                  onChange={(e) => setPaperSaver(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded border-slate-700"
                />
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 group-hover:text-white transition-colors">
                  4-Up Grid Mode
                </span>
              </label>
            </div>

            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4">INCOMING QUEUE</p>
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
               {receivedFiles.map((f) => (
                 <div key={f.id} className="p-3 rounded-lg border border-cyan-500/30 bg-slate-800 text-[10px] font-bold uppercase flex justify-between items-center">
                   <span className="truncate w-32">{f.name}</span>
                   <span className="text-cyan-400 font-black">READY</span>
                 </div>
               ))}
               {receivedFiles.length === 0 && <p className="text-[10px] text-slate-700 italic animate-pulse">Waiting for packets...</p>}
            </div>
          </aside>

          <section className="flex-1 p-0 overflow-y-auto bg-slate-950 relative">
            {printSuccess ? (
              <div className="h-full flex flex-col items-center justify-center no-print">
                <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/50 rounded-full flex items-center justify-center mb-6 text-2xl">✨</div>
                <h2 className="text-2xl font-black italic uppercase mb-2 tracking-widest text-white">Files Processed</h2>
                <button onClick={resetStation} className="mt-6 px-12 py-4 bg-white text-black font-black uppercase text-xs rounded-full hover:bg-cyan-500 transition-all shadow-lg">New Customer</button>
              </div>
            ) : receivedFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center no-print opacity-20">
                <div className="text-5xl mb-4 animate-pulse">📡</div>
                <div className="text-[10px] font-black uppercase tracking-[0.5em]">Listening...</div>
              </div>
            ) : (
              <div className="flex flex-col min-h-full">
                <div className="no-print space-y-4 p-8">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">Decrypted Stream</p>
                  {receivedFiles.map((file) => (
                    <div key={`ui-${file.id}`} className="w-full max-w-4xl mx-auto flex items-center justify-between p-4 bg-slate-900/50 border border-white/5 rounded-xl">
                       <span className="text-[10px] font-bold uppercase text-slate-400">📄 {file.name}</span>
                       <span className="text-[8px] font-bold text-cyan-400">READY</span>
                    </div>
                  ))}
                </div>

                {/* THE PRINT AREA: Applying the grid-mode class from your CSS */}
                <div className={`print-area ${paperSaver ? 'grid-mode' : ''}`}>
                  {receivedFiles.map((file, idx) => (
                    <div key={`print-item-${file.id}-${idx}`} className="print-item">
                      {file.type.startsWith("image/") ? (
                        <img 
                          src={file.blobUrl} 
                          className="print-content" 
                          alt="document" 
                        />
                      ) : (
                        <object 
                          data={file.blobUrl} 
                          type="application/pdf" 
                          className="w-full h-[85vh] print:h-screen print:w-screen"
                        >
                          <p className="text-white">PDF Preview Unavailable</p>
                        </object>
                      )}
                    </div>
                  ))}
                </div>

                <div className="fixed bottom-0 right-0 left-80 p-8 bg-slate-950/90 backdrop-blur-md border-t border-white/5 no-print flex flex-col gap-3">
                  <button 
                    onClick={() => window.print()} 
                    className="w-full bg-cyan-600 py-6 rounded-2xl font-black uppercase tracking-[0.4em] text-sm text-white shadow-2xl transition-all active:scale-[0.98]"
                  >
                    🖨️ OPEN PRINT DIALOG
                  </button>
                  <button onClick={() => setPrintSuccess(true)} className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-red-500 text-center transition-colors">
                    Finish & Clear Station
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  /* MOBILE UI */
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col p-6 overflow-hidden">
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 mb-6 flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-widest">ID: #{displayId}</span>
        <span className="text-[8px] text-green-500 font-bold animate-pulse">● LIVE</span>
      </div>
      {status === "success" ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center">
           <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center mb-6 text-2xl shadow-lg">✓</div>
           <h2 className="text-xl font-bold mb-8 uppercase tracking-widest italic">Beamed!</h2>
           <button onClick={() => setStatus("idle")} className="px-10 py-4 bg-slate-900 border border-white/10 rounded-full text-[10px] uppercase font-bold text-cyan-400">Add More</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-[20vh] rounded-[2rem] border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center mb-6"
               onClick={() => fileInputRef.current.click()}>
              <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <div className="text-3xl mb-2">📤</div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Upload Files</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 mb-6 custom-scrollbar pr-1">
            {files.map((file) => (
              <div key={file.id} className="bg-slate-900/80 p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase truncate w-40">{file.name}</span>
                  <button onClick={() => setFiles(files.filter(f => f.id !== file.id))} className="text-red-500 text-xs px-2">✕</button>
                </div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                  {status === "uploading" ? `Sending...` : `${file.size} MB`}
                </div>
                {status === "uploading" && (
                  <div className="absolute bottom-0 left-0 h-1 bg-cyan-500 transition-all duration-75" style={{ width: `${uploadProgress}%` }} />
                )}
              </div>
            ))}
          </div>
          {files.length > 0 && (
            <button 
              onClick={sendAllFiles} 
              disabled={status === "uploading"}
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all ${status === "uploading" ? 'bg-slate-800 text-slate-500' : 'bg-cyan-600 text-white'}`}>
              {status === "uploading" ? `Sending ${uploadProgress}%` : `Beam ${files.length} Files`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SecureUploader;