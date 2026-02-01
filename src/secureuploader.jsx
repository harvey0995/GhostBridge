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
        setReceivedFiles(prev => [...prev, data]);
        setPrintSuccess(false); 
      });
    }

    return () => {
      socket.off("receive-file");
    };
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

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (files.length <= 1) setStatus("idle");
  };

  const sendAllFiles = () => {
    if (files.length === 0) return;
    setStatus("uploading");
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
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

  const handlePrintAndPurge = () => {
    window.print(); 
    setPrintSuccess(true); 
    setReceivedFiles([]); 
  };

  const resetStation = () => {
    setPrintSuccess(false); 
    setStatus("idle");
  };

  if (!isCustomer) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
        <header className="flex items-center px-8 py-5 border-b border-white/5 bg-slate-900 shadow-xl no-print">
          <h1 className="text-xl font-black tracking-tighter italic text-white uppercase">GHOSTBRIDGE</h1>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <aside className="w-80 border-r border-white/5 p-8 flex flex-col bg-slate-900/50 no-print">
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

          <section className="flex-1 p-0 overflow-y-auto bg-slate-950 relative print:bg-white">
            {printSuccess ? (
              <div className="h-full flex flex-col items-center justify-center text-center no-print">
                <div className="w-20 h-20 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <span className="text-4xl">✨</span>
                </div>
                <h2 className="text-2xl font-black italic tracking-widest uppercase mb-2">Print Successful</h2>
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-8">Files Purged.</p>
                <button onClick={resetStation} className="px-12 py-4 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-full hover:bg-cyan-400 transition-all shadow-xl">
                  Ready for Next Customer
                </button>
              </div>
            ) : receivedFiles.length === 0 ? (
              <div className="h-full flex items-center justify-center no-print">
                <div className="text-center">
                  <div className="inline-block p-4 rounded-full bg-slate-900 border border-white/5 mb-4 animate-pulse">📡</div>
                  <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-[10px]">Waiting for incoming stream...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-full">
                <div className="flex flex-col gap-0 print:block">
                  {receivedFiles.map((file) => (
                    <div key={file.id} className="bg-transparent mb-10 flex flex-col print:m-0 print:p-0">
                      <div className="flex items-center gap-4 mb-4 no-print px-4">
                        <div className="text-2xl text-cyan-400">📄</div>
                        <div className="truncate text-sm font-bold text-white uppercase tracking-widest">{file.name}</div>
                      </div>

                      <div className="flex-1 overflow-hidden flex items-center justify-center print:w-full print:h-full">
                        {file.type.startsWith("image/") ? (
                          <img 
                            src={file.content} 
                            alt="preview" 
                            className="max-h-[75vh] w-auto object-contain print:w-full print:h-auto print:max-h-none" 
                          />
                        ) : (
                          <iframe
                            src={file.content}
                            className="w-full h-[75vh] border-none print:w-screen print:h-screen"
                            title="PDF Preview"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="fixed bottom-0 right-0 left-80 p-8 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 no-print">
                  <button onClick={handlePrintAndPurge} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-6 rounded-2xl font-black uppercase tracking-[0.4em] text-sm shadow-2xl transition-all">
                    🖨️ EXECUTE PRINT & PURGE
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // CUSTOMER MOBILE UI
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col font-sans p-6 overflow-hidden">
      <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-white/5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-xs">🛡️</div>
          <div>
            <p className="text-[10px] font-bold text-white uppercase truncate max-w-[150px]">Connected: #{displayId}</p>
            <p className="text-[8px] text-green-500 font-bold uppercase tracking-widest">● Secure Link Active</p>
          </div>
        </div>
      </div>

      {status === "success" ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center">
           <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20 text-2xl">✓</div>
           <h2 className="text-xl font-bold mb-2 text-white">Upload Successful</h2>
           <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-slate-900 border border-white/10 rounded-full text-[10px] uppercase font-bold text-cyan-400">Send More</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative shrink-0 h-[25vh] rounded-[2rem] border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center p-6 mb-6">
              <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current.click()} className="bg-cyan-600 px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-lg">
                Select Files
              </button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 custom-scrollbar">
              {files.map((file) => (
                <div key={file.id} className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xl">📄</span>
                    <div className="truncate">
                      <p className="text-[10px] font-bold uppercase truncate text-white">{file.name}</p>
                      <p className="text-[8px] text-slate-500 uppercase">{file.size} MB</p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(file.id)} className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center text-[10px]">✕</button>
                </div>
              ))}
            </div>
            {files.length > 0 && (
              <button onClick={sendAllFiles} className="w-full py-5 bg-cyan-600 rounded-2xl font-black text-white text-sm uppercase tracking-widest shadow-xl mb-4">
                Beam {files.length} Files
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureUploader;