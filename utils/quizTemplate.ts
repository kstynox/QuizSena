
import { RawQuestion, QuizConfig } from '../types';

export const generateQuizHtml = (questions: RawQuestion[], config: QuizConfig): string => {
  const jsonQuestions = JSON.stringify(questions);
  const jsonConfig = JSON.stringify(config);

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
        .option-btn:hover { transform: translateY(-1px); }
        .sena-bg { background-color: #39A900; }
        .sena-text { color: #39A900; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #39A900; border-radius: 10px; }
        .selected-option { border-color: #39A900 !important; background-color: #f0fdf4 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade { animation: fadeIn 0.4s ease-out forwards; }

        /* Estilos Cronómetro Circular */
        .timer-circle-container {
            position: relative;
            width: 48px;
            height: 48px;
        }
        .timer-circle-svg {
            transform: rotate(-90deg);
        }
        .timer-circle-bg {
            fill: none;
            stroke: rgba(255,255,255,0.2);
            stroke-width: 4;
        }
        .timer-circle-progress {
            fill: none;
            stroke: white;
            stroke-width: 4;
            stroke-linecap: round;
            transition: stroke-dashoffset 1s linear;
        }
    </style>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 font-sans text-slate-800">
    <div id="app" class="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        
        <!-- PANTALLA INICIAL -->
        <div id="start-screen" class="p-10 text-center animate-fade">
            <img src="https://www.sena.edu.co/Style%20Library/alayout/images/logoSena.png" alt="Logo" class="w-20 h-20 mx-auto mb-6">
            <h1 class="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">${config.title}</h1>
            <p class="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mb-8">Instructor: <span class="uppercase">${config.instructor || 'Por asignar'}</span></p>
            
            <div class="max-w-sm mx-auto mb-10 text-left">
                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Aprendiz</label>
                <input type="text" id="learner-name" placeholder="INGRESE SU NOMBRE COMPLETO" 
                       class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-[#39A900] focus:outline-none transition-all font-black text-lg shadow-sm uppercase">
            </div>

            <div class="grid grid-cols-2 gap-4 mb-10">
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Banco</p>
                    <p class="text-xl font-black text-slate-800">${config.count} Preguntas</p>
                </div>
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Duración</p>
                    <p class="text-xl font-black text-slate-800">${config.hasTimer ? config.timeLimit + ' Minutos' : 'Ilimitado'}</p>
                </div>
            </div>
            
            <button onclick="quiz.validateAndStart()" class="sena-bg hover:opacity-90 text-white font-black py-5 px-12 rounded-2xl transition-all shadow-xl w-full text-lg uppercase tracking-widest">
                Iniciar Evaluación
            </button>
        </div>

        <!-- EXAMEN -->
        <div id="quiz-screen" class="hidden">
            <div class="sena-bg px-6 py-4 text-white flex justify-between items-center relative overflow-hidden">
                <div class="z-10">
                    <span id="display-name" class="text-[10px] font-black uppercase tracking-widest opacity-80 block"></span>
                    <span id="progress-text" class="font-black text-sm uppercase"></span>
                </div>
                ${config.hasTimer ? `
                <div class="flex items-center gap-3 z-10">
                    <div class="text-right">
                         <span class="text-[9px] font-black uppercase block opacity-70">Tiempo Restante</span>
                         <span id="timer-clock" class="font-black text-sm">00:00</span>
                    </div>
                    <div class="timer-circle-container">
                        <svg class="timer-circle-svg" width="48" height="48">
                            <circle class="timer-circle-bg" cx="24" cy="24" r="20"></circle>
                            <circle id="timer-progress-ring" class="timer-circle-progress" cx="24" cy="24" r="20"></circle>
                        </svg>
                    </div>
                </div>` : ''}
            </div>
            <!-- Barra de Progreso Visual -->
            <div class="h-2 bg-slate-100 w-full overflow-hidden">
                <div id="progress-bar-fill" class="h-full sena-bg transition-all duration-700 ease-out shadow-[0_0_10px_rgba(57,169,0,0.5)]" style="width: 0%"></div>
            </div>
            
            <div class="p-10">
                <div id="multi-notice" class="hidden mb-6 p-3 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black text-blue-700 uppercase flex items-center gap-2">
                    <i class="fas fa-check-double text-sm"></i> Selección múltiple requerida
                </div>
                <h2 id="question-text" class="text-xl font-black mb-8 leading-tight min-h-[4rem] text-slate-900 animate-fade"></h2>
                <div id="options-container" class="space-y-4"></div>
                
                <div id="submit-container" class="mt-10">
                    <button id="main-action-btn" onclick="quiz.handleAction()" class="w-full sena-bg hover:opacity-90 text-white font-black py-4 rounded-2xl transition-all shadow-lg text-lg uppercase tracking-widest">
                        Enviar Respuesta
                    </button>
                </div>
            </div>
        </div>

        <!-- RESULTADOS -->
        <div id="result-screen" class="hidden p-10 animate-fade">
            <div class="text-center mb-8">
                <i class="fas fa-file-invoice text-5xl sena-text mb-4"></i>
                <h2 class="text-3xl font-black text-slate-900 mb-1 uppercase">Evaluación Finalizada</h2>
                <p id="learner-result-name" class="text-slate-400 font-black uppercase tracking-widest text-[10px]"></p>
                <p id="instructor-result-name" class="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-1"></p>
            </div>
            
            <div class="bg-slate-50 rounded-3xl p-8 border border-slate-100 text-center mb-8">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Puntaje Obtenido</p>
                <p id="score-text" class="text-6xl font-black text-slate-900 mb-4">0/0</p>
                <div id="status-badge" class="inline-block px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest"></div>
            </div>

            <div class="grid grid-cols-1 gap-4 mb-8">
                <button onclick="quiz.generatePDF()" class="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl">
                    <i class="fas fa-file-pdf"></i> DESCARGAR COMPROBANTE PDF
                </button>
                <button onclick="location.reload()" class="py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 text-xs hover:bg-slate-50 uppercase tracking-widest">
                    <i class="fas fa-redo mr-2"></i>Nueva Evaluación
                </button>
            </div>

            <div class="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar border-t pt-6" id="results-list"></div>
        </div>
    </div>

    <script>
        const POOL = ${jsonQuestions};
        const CFG = ${jsonConfig};
        
        const quiz = {
            currentIdx: 0,
            score: 0,
            learnerName: '',
            userAnswers: [],
            sessionQuestions: [],
            selectedOptions: [],
            timerInterval: null,
            totalTime: CFG.timeLimit * 60,
            secondsLeft: CFG.timeLimit * 60,
            isLocked: false,

            shuffle(a) {
                for (let i = a.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [a[i], a[j]] = [a[j], a[i]];
                }
                return a;
            },

            validateAndStart() {
                const val = document.getElementById('learner-name').value.trim();
                if (!val) { alert('Debe ingresar su nombre para comenzar'); return; }
                this.learnerName = val.toUpperCase();
                document.getElementById('display-name').innerText = this.learnerName;
                this.start();
            },

            start() {
                this.sessionQuestions = this.shuffle([...POOL]).slice(0, CFG.count);
                document.getElementById('start-screen').classList.add('hidden');
                document.getElementById('quiz-screen').classList.remove('hidden');
                if (CFG.hasTimer) this.startTimer();
                this.renderQuestion();
            },

            startTimer() {
                const clock = document.getElementById('timer-clock');
                const ring = document.getElementById('timer-progress-ring');
                const radius = ring.r.baseVal.value;
                const circumference = radius * 2 * Math.PI;
                ring.style.strokeDasharray = circumference;

                this.timerInterval = setInterval(() => {
                    this.secondsLeft--;
                    
                    // Actualizar reloj texto
                    const m = Math.floor(this.secondsLeft / 60);
                    const s = this.secondsLeft % 60;
                    clock.innerText = \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;

                    // Actualizar círculo visual
                    const offset = circumference - (this.secondsLeft / this.totalTime) * circumference;
                    ring.style.strokeDashoffset = offset;

                    if (this.secondsLeft <= 0) {
                        clearInterval(this.timerInterval);
                        alert('TIEMPO FINALIZADO. ENVIANDO RESPUESTAS.');
                        this.showResults();
                    }
                }, 1000);
            },

            renderQuestion() {
                const q = this.sessionQuestions[this.currentIdx];
                this.selectedOptions = [];
                const isMulti = q.correctas.length > 1;
                
                document.getElementById('multi-notice').style.display = isMulti ? 'flex' : 'none';
                
                const neededIncorrect = Math.max(0, CFG.optionsCount - q.correctas.length);
                const options = this.shuffle([...q.correctas, ...this.shuffle(q.incorrectas).slice(0, neededIncorrect)]);
                
                const qText = document.getElementById('question-text');
                qText.innerText = q.pregunta;

                document.getElementById('progress-text').innerText = \`Pregunta \${this.currentIdx + 1} de \${CFG.count}\`;
                document.getElementById('progress-bar-fill').style.width = \`\${((this.currentIdx + 1) / CFG.count) * 100}%\`;
                
                const container = document.getElementById('options-container');
                container.innerHTML = '';
                
                options.forEach(opt => {
                    const b = document.createElement('button');
                    b.className = 'option-btn w-full text-left p-5 rounded-2xl border-2 border-slate-100 hover:border-[#39A900] transition-all font-black flex items-center gap-4 bg-white shadow-sm group animate-fade';
                    b.innerHTML = \`<div class="indicator w-6 h-6 rounded-lg border-2 border-slate-200 flex items-center justify-center text-[10px] text-transparent group-hover:border-[#39A900]"><i class="fas fa-check"></i></div> <span>\${opt}</span>\`;
                    b.onclick = () => this.toggleOption(b, opt, isMulti);
                    container.appendChild(b);
                });
            },

            toggleOption(el, opt, isMulti) {
                if (!isMulti) {
                    document.querySelectorAll('.option-btn').forEach(b => {
                        b.classList.remove('selected-option');
                        b.querySelector('.indicator').classList.remove('sena-bg', 'border-[#39A900]', 'text-white');
                    });
                    this.selectedOptions = [opt];
                } else {
                    const idx = this.selectedOptions.indexOf(opt);
                    if (idx > -1) this.selectedOptions.splice(idx, 1);
                    else this.selectedOptions.push(opt);
                }
                
                if (this.selectedOptions.includes(opt)) {
                    el.classList.add('selected-option');
                    el.querySelector('.indicator').classList.add('sena-bg', 'border-[#39A900]', 'text-white');
                } else {
                    el.classList.remove('selected-option');
                    el.querySelector('.indicator').classList.remove('sena-bg', 'border-[#39A900]', 'text-white');
                }
            },

            handleAction() {
                if (this.selectedOptions.length === 0) { alert('Seleccione al menos una opción'); return; }
                const q = this.sessionQuestions[this.currentIdx];
                const isCorrect = this.selectedOptions.length === q.correctas.length && this.selectedOptions.every(v => q.correctas.includes(v));

                if (isCorrect) this.score++;
                this.userAnswers.push({ 
                    q: q.pregunta, 
                    sel: this.selectedOptions.join(', '), 
                    ok: q.correctas.join(', '), 
                    correct: isCorrect 
                });
                
                this.currentIdx++;
                if (this.currentIdx < CFG.count) {
                    this.renderQuestion();
                } else {
                    this.showResults();
                }
            },

            showResults() {
                clearInterval(this.timerInterval);
                document.getElementById('quiz-screen').classList.add('hidden');
                document.getElementById('result-screen').classList.remove('hidden');
                
                document.getElementById('learner-result-name').innerText = \`APRENDIZ: \${this.learnerName}\`;
                document.getElementById('instructor-result-name').innerText = \`INSTRUCTOR: \${CFG.instructor.toUpperCase() || 'SISTEMA'}\`;
                document.getElementById('score-text').innerText = \`\${this.score}/\${CFG.count}\`;
                
                const p = (this.score / CFG.count) * 100;
                const badge = document.getElementById('status-badge');
                if (p >= 70) {
                    badge.innerText = 'COMPETENCIA APROBADA';
                    badge.className = 'inline-block px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest bg-green-100 text-green-700 shadow-sm';
                } else {
                    badge.innerText = 'AUN NO COMPETENTE';
                    badge.className = 'inline-block px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest bg-red-100 text-red-700 shadow-sm';
                }
                
                const list = document.getElementById('results-list');
                list.innerHTML = '';
                this.userAnswers.forEach((ans, i) => {
                    const d = document.createElement('div');
                    d.className = \`p-5 rounded-2xl border-2 \${ans.correct ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'}\`;
                    d.innerHTML = \`<p class="text-[11px] font-black mb-2 text-slate-800 uppercase tracking-tight">\${i+1}. \${ans.q}</p>
                        <div class="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest">
                            <span class="\${ans.correct ? 'text-green-600' : 'text-red-500'}">RESPUESTA: \${ans.sel}</span>
                            <span class="text-slate-400">CORRECTA: \${ans.ok}</span>
                        </div>\`;
                    list.appendChild(d);
                });
            },

            generatePDF() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const p = Math.round((this.score / CFG.count) * 100);
                const dateStr = new Date().toLocaleString().toUpperCase();
                const instructorUpper = (CFG.instructor || 'SISTEMA').toUpperCase();

                doc.setFillColor(57, 169, 0); 
                doc.rect(0, 0, 210, 40, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(22);
                doc.setFont("helvetica", "bold");
                doc.text("COMPROBANTE DE EVALUACION", 105, 25, { align: "center" });

                doc.setTextColor(40, 40, 40);
                doc.setFontSize(14);
                doc.text(\`EVALUACION: \${CFG.title.toUpperCase()}\`, 20, 55);
                doc.text(\`INSTRUCTOR: \${instructorUpper}\`, 20, 65);
                doc.text(\`APRENDIZ: \${this.learnerName}\`, 20, 75);
                doc.text(\`FECHA: \${dateStr}\`, 20, 85);

                doc.setDrawColor(200, 200, 200);
                doc.line(20, 95, 190, 95);

                doc.setFontSize(18);
                doc.text("RESULTADO FINAL", 105, 115, { align: "center" });
                doc.setFontSize(40);
                doc.text(\`\${this.score} / \${CFG.count}\`, 105, 135, { align: "center" });
                
                doc.setFontSize(16);
                const status = p >= 70 ? "COMPETENCIA APROBADA" : "AUN NO COMPETENTE";
                doc.setTextColor(p >= 70 ? 57 : 200, p >= 70 ? 169 : 0, 0);
                doc.text(status, 105, 150, { align: "center" });

                doc.setTextColor(150, 150, 150);
                doc.setFontSize(10);
                doc.text("ESTE DOCUMENTO ES UN COMPROBANTE OFICIAL DE QUIZSENA.", 105, 280, { align: "center" });

                doc.save(\`Comprobante_\${this.learnerName.replace(/\\s+/g, '_')}.pdf\`);
            }
        };
    </script>
</body>
</html>`;
};
