function setRole(role) {
    const studentBtn = document.getElementById('btn-student');
    const recruiterBtn = document.getElementById('btn-recruiter');
    const studentForm = document.getElementById('student-form');
    const recruiterForm = document.getElementById('recruiter-form');
    const loginCard = document.getElementById('loginCard');

    if (role === 'student') {
        studentBtn.classList.add('active');
        recruiterBtn.classList.remove('active');
        
        studentForm.classList.add('active-form');
        recruiterForm.classList.remove('active-form');
        
        loginCard.classList.add('student-active');
        loginCard.classList.remove('recruiter-active');
    } else if (role === 'recruiter') {
        recruiterBtn.classList.add('active');
        studentBtn.classList.remove('active');
        
        recruiterForm.classList.add('active-form');
        studentForm.classList.remove('active-form');

        loginCard.classList.add('recruiter-active');
        loginCard.classList.remove('student-active');
    }
}