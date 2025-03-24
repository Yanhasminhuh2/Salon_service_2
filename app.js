const CONFIG = {
    scriptURL: 'https://script.google.com/macros/s/AKfycbyMG3Xs-qn54HciV2C_FHU6uvzVUVy0xIaOmAlD6jZ_J3bDzFpbhvYI_J-yhRf9nnGszQ/exec',
    groups: ['Cat', 'Uon', 'Nhuom', 'Phu', 'Overall']
};

let surveyData = {};

async function init() {
    try {
        // Load questions từ Google Sheets
        const questions = await fetch(`${CONFIG.scriptURL}?action=getQuestions`)
            .then(res => res.json());
        
        // Parse URL parameters
        const params = new URLSearchParams(location.search);
        
        CONFIG.groups.forEach(group => {
            const suffix = params.get(group);
            const questionIds = params.get(`${group}_questions`)?.split(',') || [];
            
            if(suffix && questionIds.length) {
                surveyData[group] = {
                    suffix: suffix,
                    questions: questionIds.map(qId => ({
                        id: qId,
                        text: questions.find(q => q.id === qId)?.text || 'Câu hỏi không xác định'
                    })),
                    responses: {}
                };
            }
        });
        
        renderQuestions();
    } catch (error) {
        alert('Lỗi tải dữ liệu! Vui lòng thử lại.');
        console.error('Lỗi khởi tạo:', error);
    }
}

function renderQuestions() {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';
    
    Object.values(surveyData).forEach(group => {
        group.questions.forEach(q => {
            const card = document.createElement('div');
            card.className = 'question-card';
            card.innerHTML = `
                <div class="question-text">${q.text}</div>
                <div class="stars-container">
                    ${[1,2,3,4,5].map(score => `
                        <div class="star" 
                             data-score="${score}"
                             onclick="selectScore(this, '${group.suffix}', '${q.id}')">★</div>
                    `).join('')}
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function selectScore(element, suffix, qId) {
    const stars = element.parentElement.children;
    Array.from(stars).forEach(star => {
        star.classList.toggle('active', star.dataset.score <= element.dataset.score);
    });
    
    const group = Object.values(surveyData).find(g => g.suffix === suffix);
    group.responses[qId] = parseInt(element.dataset.score);
}

async function handleSubmit() {
    try {
        const payload = Object.entries(surveyData).reduce((acc, [group, data]) => {
            if(data.suffix && Object.keys(data.responses).length > 0) {
                acc[group] = {
                    suffix: data.suffix,
                    responses: data.responses
                };
            }
            return acc;
        }, {});

        if(Object.keys(payload).length === 0) {
            alert('Vui lòng chọn ít nhất một câu hỏi!');
            return;
        }

        const response = await fetch(CONFIG.scriptURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if(result.status === 'success') {
            alert('Đánh giá thành công! Cảm ơn bạn!');
            window.location.reload();
        } else {
            throw new Error(result.message || 'Lỗi không xác định');
        }
    } catch (error) {
        alert(`Lỗi: ${error.message}`);
        console.error('Lỗi gửi dữ liệu:', error);
    }
}

window.onload = init;
