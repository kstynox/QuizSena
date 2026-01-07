
import { RawQuestion, QuizConfig } from '../types';

export const generateQuizHtml = (questions: RawQuestion[], config: QuizConfig): string => {
  // Inyectamos el JSON directamente como un objeto literal de JS para evitar errores de escape de strings
  const questionsJson = JSON.stringify(questions);
  const configJson = JSON.stringify(config);

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
        body { font-family: 'Montserrat', sans-serif; }
        .sena-bg { background-color: #39A900; }
        .sena-text { color: #39A900; }
        .option-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .selected-option { border-color: #39A900 !important; background-color: #f0fdf4 !important; }
        
        /* Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #39A900; border-radius: 10px; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade { animation: fadeIn 0.4s ease-out forwards; }

        /* Cronómetro Circular - Estilo Blanco con Texto Negro */
        .timer-container { position: relative; width: 60px; height: 60px; background: white; border-radius: 50%; padding: 2px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .timer-svg { transform: rotate(-90deg); width: 56px; height: 56px; }
        .timer-bg { fill: none; stroke: #f1f5f9; stroke-width: 5; }
        .timer-progress { fill: none; stroke: #39A900; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
        
        /* Paginación */
        .page-dot { 
          width: 36px; height: 36px; 
          display: flex; align-items: center; justify-content: center; 
          border-radius: 12px; font-weight: 900; font-size: 12px;
          cursor: pointer; transition: all 0.2s;
          border: 2px solid transparent;
        }
        .page-dot.active { background-color: #39A900; color: white; transform: scale(1.1); box-shadow: 0 4px 12px rgba(57,169,0,0.3); }
        .page-dot.answered { border-color: #39A900; color: #39A900; background-color: #f0fdf4; }
        .page-dot.pending { background-color: #f8fafc; color: #cbd5e1; border-color: #f1f5f9; }
    </style>
</head>
<body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
    <div id="quiz-app" class="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100">
        
        <!-- PANTALLA DE INICIO -->
        <div id="screen-start" class="p-12 text-center animate-fade">
            <img src="https://www.sena.edu.co/Style%20Library/alayout/images/logoSena.png" alt="Logo SENA" class="w-24 h-24 mx-auto mb-8">
            <h1 class="text-4xl font-black text-slate-900 mb-2 tracking-tight uppercase">${config.title}</h1>
            <p class="text-slate-400 text-xs font-black tracking-[0.3em] uppercase mb-12">Instructor: <span class="text-slate-600">${config.instructor || 'POR ASIGNAR'}</span></p>
            
            <div class="max-w-sm mx-auto mb-12 text-left">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Aprendiz</label>
                <input type="text" id="input-learner" placeholder="NOMBRE COMPLETO" 
                       class="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 focus:border-[#39A900] focus:outline-none transition-all font-black text-xl shadow-sm uppercase tracking-tighter">
            </div>

            <div class="grid grid-cols-2 gap-6 mb-12">
                <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Items</p>
                    <p class="text-2xl font-black text-slate-800">${config.count}</p>
                </div>
                <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Duración</p>
                    <p class="text-2xl font-black text-slate-800">${config.hasTimer ? config.timeLimit + ' Min' : '∞'}</p>
                </div>
            </div>
            
            <button onclick="quizEngine.start()" class="sena-bg hover:bg-[#2d8500] text-white font-black py-6 px-12 rounded-[2rem] transition-all shadow-xl w-full text-xl uppercase tracking-widest active:scale-95">
                COMENZAR EXAMEN
            </button>
        </div>

        <!-- PANTALLA DE CUESTIONARIO -->
        <div id="screen-quiz" class="hidden">
            <div class="sena-bg px-8 py-6 text-white flex justify-between items-center relative">
                <div class="z-10">
                    <span id="label-learner" class="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 block mb-1"></span>
                    <span id="label-progress" class="font-black text-lg uppercase tracking-tight"></span>
                </div>
                ${config.hasTimer ? `
                <div class="flex items-center gap-4 z-10 bg-white p-3 rounded-2xl shadow-lg">
                    <div class="text-right">
                         <span class="text-[8px] font-black uppercase text-slate-400 block leading-none mb-1">Tiempo</span>
                         <span id="label-timer" class="font-black text-base tracking-widest leading-none text-slate-900">00:00</span>
                    </div>
                    <div class="timer-container">
                        <svg class="timer-svg" viewBox="0 0 60 60">
                            <circle class="timer-bg" cx="30" cy="30" r="26"></circle>
                            <circle id="timer-ring" class="timer-progress" cx="30" cy="30" r="26"></circle>
                        </svg>
                    </div>
                </div>` : ''}
            </div>
            
            <div class="h-2 bg-slate-100 w-full overflow-hidden">
                <div id="bar-progress" class="h-full sena-bg transition-all duration-500" style="width: 0%"></div>
            </div>
            
            <div class="p-10">
                ${!config.sequentialMode ? `
                <div id="nav-pagination" class="flex flex-wrap gap-2 mb-8 justify-center border-b border-slate-50 pb-6 custom-scrollbar max-h-24 overflow-y-auto"></div>
                ` : ''}

                <div id="notice-multi" class="hidden mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-[10px] font-black text-blue-700 uppercase flex items-center gap-3">
                    <i class="fas fa-check-double text-lg"></i> Selección Múltiple
                </div>
                
                <h2 id="quiz-question" class="text-2xl font-black mb-8 leading-snug min-h-[4rem] text-slate-900"></h2>
                <div id="quiz-options" class="space-y-4"></div>
                
                <div class="mt-12 flex gap-4">
                    ${!config.sequentialMode ? `
                    <button id="btn-prev" onclick="quizEngine.prev()" class="px-8 py-5 border-2 border-slate-100 text-slate-400 font-black rounded-3xl transition-all hover:bg-slate-50 uppercase tracking-widest text-sm active:scale-95">
                        <i class="fas fa-chevron-left mr-2"></i> Anterior
                    </button>
                    ` : ''}
                    <button id="btn-main" onclick="quizEngine.handleMainAction()" class="flex-grow sena-bg hover:bg-[#2d8500] text-white font-black py-5 rounded-[1.5rem] transition-all shadow-xl text-xl uppercase tracking-widest active:scale-95">
                        SIGUIENTE
                    </button>
                </div>
            </div>
        </div>

        <!-- PANTALLA DE RESULTADOS -->
        <div id="screen-results" class="hidden p-12 animate-fade">
            <div class="text-center mb-10">
                <div class="w-20 h-20 sena-bg text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <i class="fas fa-poll text-4xl"></i>
                </div>
                <h2 class="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">RESULTADOS</h2>
                <p id="res-learner" class="text-slate-400 font-black uppercase tracking-widest text-[11px]"></p>
                <p id="res-instructor" class="text-slate-400 font-black uppercase tracking-widest text-[11px] mt-2"></p>
            </div>
            
            <div class="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 text-center mb-10 shadow-inner">
                <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Calificación</p>
                <p id="res-score" class="text-8xl font-black text-slate-900 mb-6 tracking-tighter">0/0</p>
                <div id="res-status" class="inline-block px-12 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-lg"></div>
            </div>

            <div class="grid grid-cols-1 gap-4 mb-10">
                <button onclick="quizEngine.generatePDF()" class="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95">
                    <i class="fas fa-file-pdf"></i> GENERAR PDF
                </button>
                <button onclick="location.reload()" class="py-4 border-2 border-slate-100 rounded-[1.5rem] font-black text-slate-400 text-xs hover:bg-slate-50 uppercase tracking-widest transition-all">
                    NUEVO INTENTO
                </button>
            </div>

            <div class="space-y-4 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar border-t border-slate-100 pt-8" id="res-list"></div>
        </div>
    </div>

    <script>
        // Inyección segura de datos
        const QUESTIONS_DATA = ${questionsJson};
        const CONFIG_DATA = ${configJson};
        
        const quizEngine = {
            currentIndex: 0,
            score: 0,
            learnerName: '',
            sessionPool: [],
            userAnswers: [], 
            displayOptions: [], 
            timerId: null,
            secondsLeft: CONFIG_DATA.timeLimit * 60,
            totalSeconds: CONFIG_DATA.timeLimit * 60,

            shuffle(array) {
                let current = array.length, random;
                while (current != 0) {
                    random = Math.floor(Math.random() * current);
                    current--;
                    [array[current], array[random]] = [array[random], array[current]];
                }
                return array;
            },

            start() {
                const name = document.getElementById('input-learner').value.trim();
                if (!name) { alert('INGRESE SU NOMBRE'); return; }
                this.learnerName = name.toUpperCase();
                
                this.sessionPool = this.shuffle([...QUESTIONS_DATA]).slice(0, CONFIG_DATA.count);
                
                this.sessionPool.forEach(q => {
                    this.userAnswers.push([]);
                    const neededIncorrect = Math.max(0, CONFIG_DATA.optionsCount - q.correctas.length);
                    const poolIncorrect = this.shuffle([...q.incorrectas]).slice(0, neededIncorrect);
                    const combined = this.shuffle([...q.correctas, ...poolIncorrect]);
                    this.displayOptions.push(combined);
                });

                document.getElementById('screen-start').classList.add('hidden');
                document.getElementById('screen-quiz').classList.remove('hidden');
                document.getElementById('label-learner').innerText = this.learnerName;
                
                if (CONFIG_DATA.hasTimer) this.initTimer();
                this.render();
            },

            initTimer() {
                const label = document.getElementById('label-timer');
                const ring = document.getElementById('timer-ring');
                const circumference = 26 * 2 * Math.PI;
                if (ring) {
                    ring.style.strokeDasharray = circumference;
                    ring.style.strokeDashoffset = 0;
                }

                this.timerId = setInterval(() => {
                    this.secondsLeft--;
                    const m = Math.floor(this.secondsLeft / 60);
                    const s = this.secondsLeft % 60;
                    if (label) label.innerText = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
                    
                    if (ring) {
                        const offset = circumference - (this.secondsLeft / this.totalSeconds) * circumference;
                        ring.style.strokeDashoffset = offset;
                    }

                    if (this.secondsLeft <= 0) {
                        clearInterval(this.timerId);
                        alert('¡TIEMPO AGOTADO!');
                        this.finish();
                    }
                }, 1000);
            },

            render() {
                const q = this.sessionPool[this.currentIndex];
                const opts = this.displayOptions[this.currentIndex];
                const isMulti = q.correctas.length > 1;
                
                document.getElementById('notice-multi').style.display = isMulti ? 'flex' : 'none';
                document.getElementById('quiz-question').innerText = q.pregunta;
                document.getElementById('label-progress').innerText = 'ITEM ' + (this.currentIndex + 1) + ' / ' + CONFIG_DATA.count;
                document.getElementById('bar-progress').style.width = ((this.currentIndex + 1) / CONFIG_DATA.count * 100) + '%';

                const optionsContainer = document.getElementById('quiz-options');
                optionsContainer.innerHTML = '';
                
                opts.forEach(opt => {
                    const btn = document.createElement('button');
                    const isSelected = this.userAnswers[this.currentIndex].includes(opt);
                    btn.className = 'option-btn w-full text-left p-6 rounded-[1.5rem] border-2 border-slate-100 font-black flex items-center gap-5 bg-white shadow-sm group animate-fade';
                    if (isSelected) btn.classList.add('selected-option');
                    
                    const indicatorClass = isSelected ? 'sena-bg border-[#39A900] text-white' : 'text-transparent border-slate-200';
                    btn.innerHTML = '<div class="indicator w-7 h-7 rounded-xl border-2 flex items-center justify-center text-[11px] ' + indicatorClass + ' transition-colors"><i class="fas fa-check"></i></div> <span class="text-slate-700">' + opt + '</span>';
                    btn.onclick = () => this.toggle(btn, opt, isMulti);
                    optionsContainer.appendChild(btn);
                });

                const isLast = this.currentIndex === CONFIG_DATA.count - 1;
                document.getElementById('btn-main').innerText = isLast ? 'FINALIZAR' : 'SIGUIENTE';

                if (!CONFIG_DATA.sequentialMode) {
                    this.renderPagination();
                    const prevBtn = document.getElementById('btn-prev');
                    if (prevBtn) prevBtn.style.display = this.currentIndex > 0 ? 'flex' : 'none';
                }
            },

            renderPagination() {
                const nav = document.getElementById('nav-pagination');
                if (!nav) return;
                nav.innerHTML = '';
                this.sessionPool.forEach((_, i) => {
                    const dot = document.createElement('div');
                    const hasAnswer = this.userAnswers[i].length > 0;
                    const isCurrent = this.currentIndex === i;
                    
                    dot.className = 'page-dot';
                    if (isCurrent) dot.classList.add('active');
                    else if (hasAnswer) dot.classList.add('answered');
                    else dot.classList.add('pending');
                    
                    dot.innerText = i + 1;
                    dot.onclick = () => {
                        this.currentIndex = i;
                        this.render();
                    };
                    nav.appendChild(dot);
                });
            },

            toggle(el, val, multi) {
                let current = this.userAnswers[this.currentIndex];
                if (!multi) {
                    document.querySelectorAll('.option-btn').forEach(b => {
                        b.classList.remove('selected-option');
                        b.querySelector('.indicator').className = 'indicator w-7 h-7 rounded-xl border-2 border-slate-200 flex items-center justify-center text-[11px] text-transparent transition-colors';
                    });
                    this.userAnswers[this.currentIndex] = [val];
                } else {
                    const idx = current.indexOf(val);
                    if (idx > -1) current.splice(idx, 1);
                    else current.push(val);
                }
                
                const isNow = this.userAnswers[this.currentIndex].includes(val);
                if (isNow) {
                    el.classList.add('selected-option');
                    el.querySelector('.indicator').className = 'indicator w-7 h-7 rounded-xl border-2 sena-bg border-[#39A900] text-white flex items-center justify-center text-[11px] transition-colors';
                } else {
                    el.classList.remove('selected-option');
                    el.querySelector('.indicator').className = 'indicator w-7 h-7 rounded-xl border-2 border-slate-200 flex items-center justify-center text-[11px] text-transparent transition-colors';
                }

                if (!CONFIG_DATA.sequentialMode) this.renderPagination();
            },

            prev() {
                if (this.currentIndex > 0) {
                    this.currentIndex--;
                    this.render();
                }
            },

            handleMainAction() {
                if (this.userAnswers[this.currentIndex].length === 0) {
                    alert('POR FAVOR SELECCIONE UNA RESPUESTA');
                    return;
                }

                if (this.currentIndex < CONFIG_DATA.count - 1) {
                    this.currentIndex++;
                    this.render();
                } else {
                    this.finish();
                }
            },

            finish() {
                clearInterval(this.timerId);
                this.score = 0;
                const results = [];

                this.sessionPool.forEach((q, i) => {
                    const sel = this.userAnswers[i];
                    const correct = sel.length === q.correctas.length && sel.every(v => q.correctas.includes(v));
                    if (correct) this.score++;
                    results.push({
                        q: q.pregunta,
                        sel: sel.length > 0 ? sel.join(', ') : 'SIN RESPUESTA',
                        ok: q.correctas.join(', '),
                        correct: correct
                    });
                });

                document.getElementById('screen-quiz').classList.add('hidden');
                document.getElementById('screen-results').classList.remove('hidden');
                
                document.getElementById('res-learner').innerText = 'APRENDIZ: ' + this.learnerName;
                document.getElementById('res-instructor').innerText = 'INSTRUCTOR: ' + (CONFIG_DATA.instructor || 'PLATAFORMA').toUpperCase();
                document.getElementById('res-score').innerText = this.score + ' / ' + CONFIG_DATA.count;
                
                const ratio = (this.score / CONFIG_DATA.count) * 100;
                const badge = document.getElementById('res-status');
                if (ratio >= 70) {
                    badge.innerText = 'APROBADO';
                    badge.className = 'inline-block px-12 py-4 rounded-full font-black text-sm uppercase tracking-widest bg-green-100 text-green-700 shadow-sm';
                } else {
                    badge.innerText = 'NO APROBADO';
                    badge.className = 'inline-block px-12 py-4 rounded-full font-black text-sm uppercase tracking-widest bg-red-100 text-red-700 shadow-sm';
                }
                
                const list = document.getElementById('res-list');
                list.innerHTML = '';
                results.forEach((item, i) => {
                    const div = document.createElement('div');
                    div.className = 'p-6 rounded-[2rem] border-2 ' + (item.correct ? 'border-green-100 bg-green-50/40' : 'border-red-100 bg-red-50/40');
                    div.innerHTML = '<p class="text-[12px] font-black mb-3 text-slate-800 uppercase tracking-tight">' + (i+1) + '. ' + item.q + '</p>' +
                        '<div class="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest">' +
                            '<span class="' + (item.correct ? 'text-green-600' : 'text-red-500') + '">SELECCIÓN: ' + item.sel + '</span>' +
                            '<span class="text-slate-400">CORRECTA: ' + item.ok + '</span>' +
                        '</div>';
                    list.appendChild(div);
                });
            },

            generatePDF() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const ratio = Math.round((this.score / CONFIG_DATA.count) * 100);
                const date = new Date().toLocaleString().toUpperCase();

                doc.setFillColor(57, 169, 0); 
                doc.rect(0, 0, 210, 45, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(24);
                doc.setFont("helvetica", "bold");
                doc.text("RESULTADOS DE EVALUACIÓN", 105, 28, { align: "center" });

                doc.setTextColor(50, 50, 50);
                doc.setFontSize(13);
                doc.text('PRUEBA: ' + CONFIG_DATA.title.toUpperCase(), 20, 60);
                doc.text('APRENDIZ: ' + this.learnerName, 20, 70);
                doc.text('FECHA: ' + date, 20, 80);

                doc.setDrawColor(230, 230, 230);
                doc.line(20, 90, 190, 90);

                doc.setFontSize(18);
                doc.text("CALIFICACIÓN", 105, 115, { align: "center" });
                doc.setFontSize(60);
                doc.text(this.score + ' / ' + CONFIG_DATA.count, 105, 145, { align: "center" });
                
                doc.setFontSize(18);
                const status = ratio >= 70 ? "APROBADO" : "NO APROBADO";
                doc.setTextColor(ratio >= 70 ? 57 : 200, ratio >= 70 ? 169 : 0, 0);
                doc.text(status, 105, 165, { align: "center" });

                doc.save('Resultado_' + this.learnerName.replace(/\\s+/g, '_') + '.pdf');
            }
        };
    </script>
</body>
</html>`;
};
