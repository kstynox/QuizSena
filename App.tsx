
import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { RawQuestion, QuizConfig } from './types';
import { generateQuizHtml } from './utils/quizTemplate';

const App: React.FC = () => {
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [config, setConfig] = useState<QuizConfig>(() => {
    const saved = localStorage.getItem('quiz_config_v4');
    return saved ? JSON.parse(saved) : { 
      title: 'Evaluación de Aprendizaje SENA', 
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
    localStorage.setItem('quiz_config_v4', JSON.stringify(config));
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
          alert("No se detectaron preguntas válidas.");
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
    if (questions.length === 0) return;
    const htmlContent = generateQuizHtml(questions, config);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuizSENA_${config.title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 text-slate-800">
      <header className="flex flex-col items-center mb-8">
        <img src="https://www.sena.edu.co/Style%20Library/alayout/images/logoSena.png" alt="Logo SENA" className="w-20 h-20 mb-4" />
        <h1 className="text-4xl font-black text-gray-900 mb-1 tracking-tight">QuizSENA</h1>
        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-6">Administración de Evaluaciones</p>
        
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-[#39A900] font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
              <i className="fas fa-info-circle"></i> Instrucciones
            </h3>
            <p className="text-[10px] text-gray-500 font-bold leading-relaxed">1. Sube tu banco de preguntas en Excel (.xlsx).</p>
            <p className="text-[10px] text-gray-500 font-bold leading-relaxed">2. Define instructor y parámetros de rigor.</p>
            <p className="text-[10px] text-gray-500 font-bold leading-relaxed">3. Genera un examen HTML interactivo.</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Estado del Banco</p>
            <div className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${questions.length > 0 ? 'bg-[#39A900] shadow-[0_0_8px_#39A900]' : 'bg-gray-300'}`}></div>
               <span className="text-sm font-black">{questions.length} preguntas cargadas</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 h-full">
             <h2 className="text-lg font-black text-gray-800 mb-6 uppercase tracking-tight flex items-center gap-2">
                <i className="fas fa-file-excel text-[#39A900]"></i> Fuente de Datos
             </h2>
             
             <div 
               onClick={() => fileInputRef.current?.click()}
               className={`h-48 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 mb-6 ${fileName ? 'border-[#39A900] bg-green-50/30' : 'border-gray-200 hover:border-[#39A900] group'}`}
             >
               <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx" className="hidden" />
               {isLoading ? (
                 <div className="animate-spin text-4xl text-[#39A900]"><i className="fas fa-circle-notch"></i></div>
               ) : fileName ? (
                 <div className="text-center p-4 animate-fade">
                   <i className="fas fa-check-double text-5xl text-[#39A900] mb-3"></i>
                   <p className="text-[#39A900] font-black text-sm truncate max-w-[200px]">{fileName}</p>
                 </div>
               ) : (
                 <div className="text-center p-4 group-hover:scale-105 transition-transform">
                   <i className="fas fa-cloud-upload-alt text-5xl text-gray-300 mb-3 group-hover:text-[#39A900] transition-colors"></i>
                   <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Subir Banco Excel</p>
                 </div>
               )}
             </div>

             {questions.length > 0 && (
               <div className="space-y-4 animate-fade">
                 <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Vista Previa</h3>
                 <div className="p-6 rounded-2xl bg-gray-900 text-white shadow-inner">
                    <p className="text-[9px] text-[#39A900] font-black mb-2 uppercase tracking-tighter">Ejemplo Visual:</p>
                    <p className="text-sm font-bold leading-snug mb-4">{questions[0].pregunta}</p>
                    <div className="space-y-2">
                       {questions[0].correctas.slice(0, 1).map((opt, i) => (
                         <div key={i} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold border border-white/5 flex items-center gap-2">
                            <div className="w-3 h-3 rounded border border-white/20"></div> {opt}
                         </div>
                       ))}
                       {questions[0].incorrectas.slice(0, config.optionsCount - 1).map((opt, i) => (
                         <div key={i} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold border border-white/5 flex items-center gap-2">
                            <div className="w-3 h-3 rounded border border-white/20"></div> {opt}
                         </div>
                       ))}
                    </div>
                 </div>
               </div>
             )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 flex flex-col h-full">
            <h2 className="text-xl font-black text-gray-800 tracking-tight mb-8 uppercase flex items-center gap-3">
               <i className="fas fa-sliders-h text-[#39A900]"></i> Configuración
            </h2>

            <div className="space-y-6 flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Título de la Evaluación</label>
                  <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white text-black focus:border-[#39A900] focus:outline-none transition-all font-bold text-sm shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nombre del Instructor</label>
                  <input type="text" placeholder="Ej: JUAN PEREZ" value={config.instructor} onChange={(e) => setConfig({ ...config, instructor: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white text-black focus:border-[#39A900] focus:outline-none transition-all font-bold text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">N° de Preguntas Aleatorias</label>
                  <input type="number" min="1" max={questions.length || 100} value={config.count}
                    onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) || 0 })}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white text-black focus:border-[#39A900] focus:outline-none transition-all font-bold text-sm shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Opciones Visibles</label>
                  <select value={config.optionsCount} onChange={(e) => setConfig({ ...config, optionsCount: parseInt(e.target.value) })}
                    className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white text-black focus:border-[#39A900] focus:outline-none transition-all font-bold text-sm shadow-sm"
                  >
                    <option value={4}>4 Opciones</option>
                    <option value={5}>5 Opciones</option>
                    <option value={6}>6 Opciones</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border-2 transition-all flex items-center gap-4 border-gray-100 bg-white shadow-sm">
                   <input type="checkbox" id="c-timer" checked={config.hasTimer} onChange={(e) => setConfig({...config, hasTimer: e.target.checked})} className="w-6 h-6 accent-[#39A900]" />
                   <div className="flex-grow">
                      <label htmlFor="c-timer" className="block text-[10px] font-black text-slate-800 uppercase cursor-pointer">Temporizador Global</label>
                      {config.hasTimer && (
                         <div className="flex items-center gap-2 mt-1">
                            <input type="number" min="1" value={config.timeLimit} onChange={(e) => setConfig({...config, timeLimit: parseInt(e.target.value) || 1})}
                              className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold focus:outline-none focus:border-[#39A900] text-black"
                            />
                            <span className="text-[10px] font-bold text-gray-400">minutos</span>
                         </div>
                      )}
                   </div>
                </div>

                <div className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${config.sequentialMode ? 'border-[#39A900] bg-green-50/50' : 'border-gray-100 bg-gray-50'}`}>
                   <input type="checkbox" id="c-seq" checked={config.sequentialMode} onChange={(e) => setConfig({...config, sequentialMode: e.target.checked})} className="w-6 h-6 accent-[#39A900]" />
                   <div>
                      <label htmlFor="c-seq" className="block text-[10px] font-black text-gray-500 uppercase cursor-pointer">Modo Secuencial</label>
                      <p className="text-[8px] text-gray-400 italic font-bold">Flujo unidireccional</p>
                   </div>
                </div>
              </div>
            </div>

            <button onClick={downloadQuiz} disabled={questions.length === 0}
              className={`w-full py-5 rounded-2xl font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-4 mt-10 transform active:scale-95 ${
                questions.length > 0 ? 'bg-[#39A900] hover:bg-[#2d8500] text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
              }`}
            >
              <i className="fas fa-magic"></i> GENERAR EVALUACIÓN
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-gray-400">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Servicio Nacional de Aprendizaje • SENA 2025</p>
      </footer>
    </div>
  );
};

export default App;
