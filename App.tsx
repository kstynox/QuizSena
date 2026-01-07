
import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { RawQuestion, QuizConfig } from './types';
import { generateQuizHtml } from './utils/quizTemplate';

const App: React.FC = () => {
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [config, setConfig] = useState<QuizConfig>(() => {
    const saved = localStorage.getItem('quiz_config_v8');
    return saved ? JSON.parse(saved) : { 
      title: 'EVALUACIÓN DE APRENDIZAJE', 
      instructor: '',
      count: 10,
      optionsCount: 4,
      hasTimer: false,
      timeLimit: 30,
      sequentialMode: true
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('quiz_config_v8', JSON.stringify(config));
  }, [config]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const allData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        const data = allData.slice(1); 
        
        const parsed: RawQuestion[] = data
          .filter(row => row && row.length >= 2 && row[0] && row[1])
          .map(row => ({
              pregunta: String(row[0]),
              correctas: String(row[1]).split(';').map(s => s.trim()).filter(s => s.length > 0),
              incorrectas: [row[2], row[3], row[4], row[5], row[6]]
                .filter(val => val !== undefined && val !== null && val !== '')
                .map(val => String(val))
          }));

        if (parsed.length === 0) {
          alert("No se detectaron preguntas válidas. Asegúrese de que la columna A sea la pregunta y la B la respuesta correcta.");
          setFileName(null);
        } else {
          setQuestions(parsed);
          setConfig(prev => ({ ...prev, count: Math.min(parsed.length, prev.count || 10) }));
        }
      } catch (err) {
        alert("Error al procesar el archivo Excel.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadQuiz = () => {
    if (questions.length === 0) {
        alert("Cargue un archivo Excel (.xlsx) primero.");
        return;
    }
    try {
        const htmlContent = generateQuizHtml(questions, config);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cuestionario_${config.title.replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Error al generar el examen.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 text-slate-800 antialiased">
      <header className="flex flex-col items-center mb-12">
        <img src="https://www.sena.edu.co/Style%20Library/alayout/images/logoSena.png" alt="SENA" className="w-24 h-24 mb-6" />
        <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter italic">QuizSENA</h1>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.4em] mb-10">Generador de Evaluaciones Institucionales</p>
        
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="text-[#39A900] font-black text-xs uppercase tracking-widest flex items-center gap-3">
              <i className="fas fa-check-circle text-lg"></i> Instrucciones
            </h3>
            <ul className="text-[11px] text-slate-400 font-black space-y-3 uppercase tracking-tight list-none p-0">
                <li className="flex items-start gap-2">1. Seleccione un archivo Excel (.xlsx)</li>
                <li className="flex items-start gap-2">2. Defina los parámetros de rigor</li>
                <li className="flex items-start gap-2">3. Descargue su archivo HTML</li>
            </ul>
          </div>
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col justify-center text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Estado</p>
            <div className="flex flex-col items-center gap-2">
               <span className={`text-5xl font-black ${questions.length > 0 ? 'text-[#39A900]' : 'text-slate-300'}`}>
                 {questions.length}
               </span>
               <span className="text-xs font-black uppercase tracking-widest text-slate-500">Items Listos</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-50 h-full">
             <h2 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tight flex items-center gap-3">
                <i className="fas fa-file-excel text-[#39A900]"></i> Archivo Banco
             </h2>
             
             <div 
               onClick={() => fileInputRef.current?.click()}
               className={`h-60 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 mb-8 ${fileName ? 'border-[#39A900] bg-green-50/20' : 'border-slate-100 hover:border-[#39A900] group'}`}
             >
               <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx" className="hidden" />
               {isLoading ? (
                 <div className="animate-spin text-5xl text-[#39A900]"><i className="fas fa-circle-notch"></i></div>
               ) : fileName ? (
                 <div className="text-center p-8 animate-fade">
                   <i className="fas fa-file-excel text-6xl text-[#39A900] mb-4"></i>
                   <p className="text-[#39A900] font-black text-sm truncate max-w-[240px] uppercase tracking-tighter">{fileName}</p>
                 </div>
               ) : (
                 <div className="text-center p-8 group-hover:scale-105 transition-transform">
                   <i className="fas fa-cloud-upload text-6xl text-slate-100 mb-4 group-hover:text-[#39A900] transition-colors"></i>
                   <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Subir Excel</p>
                 </div>
               )}
             </div>

             {questions.length > 0 && (
               <div className="space-y-6 animate-fade">
                 <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50 pb-3">Vista Previa</h3>
                 <div className="p-8 rounded-[2rem] bg-slate-900 text-white shadow-2xl relative">
                    <p className="text-[9px] text-[#39A900] font-black mb-3 uppercase tracking-[0.2em]">Item Muestra</p>
                    <p className="text-base font-bold leading-relaxed mb-6 italic text-slate-200">"{questions[0].pregunta}"</p>
                    <div className="space-y-3">
                       <div className="bg-white/5 p-4 rounded-2xl text-[10px] font-black border border-white/5 flex items-center gap-3">
                          <div className="w-5 h-5 rounded-lg border-2 border-[#39A900] bg-[#39A900]/20"></div> {questions[0].correctas[0]}
                       </div>
                       <div className="bg-white/5 p-4 rounded-2xl text-[10px] font-black border border-white/5 flex items-center gap-3 opacity-40">
                          <div className="w-5 h-5 rounded-lg border-2 border-white/20"></div> {questions[0].incorrectas[0] || 'Opción distractora'}
                       </div>
                    </div>
                 </div>
               </div>
             )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2.5rem] p-12 shadow-xl border border-slate-50 flex flex-col h-full">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-10 uppercase flex items-center gap-4">
               <i className="fas fa-sliders-h text-[#39A900]"></i> Configuración
            </h2>

            <div className="space-y-8 flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Título</label>
                  <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="w-full px-6 py-5 rounded-3xl border-2 border-slate-50 bg-white text-slate-900 focus:border-[#39A900] focus:outline-none transition-all font-black text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Instructor</label>
                  <input type="text" placeholder="NOMBRE COMPLETO" value={config.instructor} onChange={(e) => setConfig({ ...config, instructor: e.target.value })}
                    className="w-full px-6 py-5 rounded-3xl border-2 border-slate-50 bg-white text-slate-900 focus:border-[#39A900] focus:outline-none transition-all font-black text-sm uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Items por Examen</label>
                  <input type="number" min="1" max={questions.length || 100} value={config.count}
                    onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) || 0 })}
                    className="w-full px-6 py-5 rounded-3xl border-2 border-slate-50 font-black text-sm focus:border-[#39A900] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Opciones</label>
                  <select value={config.optionsCount} onChange={(e) => setConfig({ ...config, optionsCount: parseInt(e.target.value) })}
                    className="w-full px-6 py-5 rounded-3xl border-2 border-slate-50 font-black text-sm focus:border-[#39A900] outline-none"
                  >
                    {[2,3,4,5,6].map(v => <option key={v} value={v}>{v} Opciones</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Caja de Temporizador: Blanco fondo, negro texto */}
                <div className="p-8 rounded-[2rem] border-2 border-slate-50 bg-white shadow-sm flex items-center gap-6">
                   <input type="checkbox" id="check-timer" checked={config.hasTimer} onChange={(e) => setConfig({...config, hasTimer: e.target.checked})} className="w-8 h-8 accent-[#39A900]" />
                   <div className="flex-grow">
                      <label htmlFor="check-timer" className="block text-[11px] font-black text-slate-900 uppercase tracking-widest cursor-pointer">Cronómetro</label>
                      {config.hasTimer && (
                         <div className="flex items-center gap-3 mt-4">
                            <input type="number" min="1" value={config.timeLimit} onChange={(e) => setConfig({...config, timeLimit: parseInt(e.target.value) || 1})}
                              className="w-24 px-4 py-3 rounded-2xl border-2 border-slate-100 font-black text-sm bg-white text-slate-900"
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minutos</span>
                         </div>
                      )}
                   </div>
                </div>

                <div className={`p-8 rounded-[2rem] border-2 transition-all flex items-center gap-6 ${config.sequentialMode ? 'border-[#39A900] bg-[#f0fdf4]' : 'border-slate-50 bg-white shadow-sm'}`}>
                   <input type="checkbox" id="check-seq" checked={config.sequentialMode} onChange={(e) => setConfig({...config, sequentialMode: e.target.checked})} className="w-8 h-8 accent-[#39A900]" />
                   <div className="cursor-pointer" onClick={() => setConfig({...config, sequentialMode: !config.sequentialMode})}>
                      <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest">Modo Secuencial</label>
                      <p className="text-[9px] text-slate-400 font-black uppercase mt-2 tracking-tighter leading-tight">
                        {config.sequentialMode ? 'Avance único' : 'Navegación libre'}
                      </p>
                   </div>
                </div>
              </div>
            </div>

            <button onClick={downloadQuiz} disabled={questions.length === 0}
              className={`w-full py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-5 mt-12 transform active:scale-95 ${
                questions.length > 0 ? 'bg-[#39A900] hover:bg-[#2d8500] text-white' : 'bg-slate-50 text-slate-200 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-magic"></i> GENERAR EXAMEN
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-20 text-center border-t border-slate-100 pt-12">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">SENA • 2025</p>
      </footer>
    </div>
  );
};

export default App;
