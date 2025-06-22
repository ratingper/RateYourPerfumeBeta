// --- SDK IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// --- FIREBASE INITIALIZATION ---
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBz6KfTqDjepXYgDttLH45KFAA3kdLFjIE",
  authDomain: "rateyourperfume-cc678.firebaseapp.com",
  projectId: "rateyourperfume-cc678",
  storageBucket: "rateyourperfume-cc678.firebasestorage.app",
  messagingSenderId: "969191542334",
  appId: "1:969191542334:web:fce83e13f43690e1890b6f",
  measurementId: "G-4G6R7N3J5R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// --- CLOUDINARY CONFIGURATION ---
const CLOUDINARY_CLOUD_NAME = 'djb6fug6g';
const CLOUDINARY_UPLOAD_PRESET = 'bco4tza2';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// --- Admin User ID ---
const ADMIN_UID = 'WJD0saAt2gWbFavVuAMAQHxqpxX2';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & UI ELEMENTS ---
    const state = { user: null, category: null, rating: 0 };
    const userInfoDiv = document.getElementById('user-info');
    const verificationNotice = document.getElementById('email-verification-notice');
    const adminLinkContainer = document.getElementById('admin-link-container');

    // --- AUTHENTICATION ---
    onAuthStateChanged(auth, (user) => {
        adminLinkContainer.innerHTML = '';
        if (user) {
            state.user = { id: user.uid, name: user.displayName, email: user.email, picture: user.photoURL, emailVerified: user.emailVerified };
            updateUserInfoUI();
            
            if (state.user.id === ADMIN_UID) {
                adminLinkContainer.innerHTML = `<a href="#admin" class="text-link">Admin Panel</a>`;
                if (window.location.hash !== '#admin' && window.location.hash !== '') {
                    window.location.hash = '#admin';
                }
            } else {
                const currentHash = window.location.hash.split('?')[0];
                if (['#login', '#signup'].includes(currentHash)) {
                    window.location.hash = '#category-selection';
                }
            }
        } else {
            state.user = null;
            updateUserInfoUI();
            const protectedHashes = ['#review', '#admin', '#category-selection', '#question'];
            if (protectedHashes.includes(window.location.hash.split('?')[0])) {
                window.location.hash = '#login';
            }
        }
    });

    function updateUserInfoUI() {
        userInfoDiv.innerHTML = '';
        verificationNotice.classList.remove('show');
        if (state.user) {
            const userImage = state.user.picture ? `<img src="${state.user.picture}" alt="User profile">` : `<span></span>`;
            const userName = state.user.name ? `<span>Hello, ${state.user.name.split(' ')[0]}</span>` : '';
            userInfoDiv.innerHTML = `${userImage}${userName}<button id="sign-out-btn" class="btn">Sign Out</button>`;
            document.getElementById('sign-out-btn').addEventListener('click', () => signOut(auth).then(() => { window.location.hash = '#landing'; }));
            
            const isEmailUser = auth.currentUser.providerData.some(p => p.providerId === 'password');
            if (isEmailUser && !state.user.emailVerified) {
                verificationNotice.classList.add('show');
            }
        }
    }
    
    function handleAuthError(error) {
        console.error(`Auth Error: ${error.code}`, error.message);
        alert(`Error: ${error.message.replace('Firebase: ', '')}`);
    }

    // --- AUTH FORM HANDLERS ---
    document.getElementById('google-login-btn').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()).catch(handleAuthError));
    
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            await sendEmailVerification(userCredential.user);
            alert("Account created! Please check your email to verify your account.");
        } catch (error) {
            handleAuthError(error);
        }
    });

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).catch(handleAuthError);
    });

    // --- ROUTER & NAVIGATION ---
    const pages = document.querySelectorAll('.page');
    const navigateTo = (hash) => {
        const cleanHash = (hash.split('?')[0] || '#landing') || '#landing';
        const targetPage = document.querySelector(`#page-${cleanHash.substring(1)}`);
        pages.forEach(p => p.classList.remove('active'));
        if (targetPage) {
            targetPage.classList.add('active');
            window.scrollTo(0, 0);
            state.category = new URLSearchParams(hash.split('?')[1]).get('category');
            const initializers = { '#question': initQuestionPage, '#review': initReviewPage, '#main': initMainPage, '#admin': initAdminPage };
            if (initializers[cleanHash]) {
                initializers[cleanHash]();
            }
        } else { 
            document.getElementById('page-landing').classList.add('active');
        }
    };
    navigateTo(window.location.hash);
    window.addEventListener('hashchange', () => navigateTo(window.location.hash));
    
    // --- NAVIGATION EVENT LISTENERS ---
    document.getElementById('start-discovery').addEventListener('click', () => { window.location.hash = '#auth'; });
    document.getElementById('go-to-login-btn').addEventListener('click', () => { window.location.hash = '#login'; });
    document.getElementById('continue-as-guest-btn').addEventListener('click', () => { window.location.hash = '#category-selection'; });
    document.querySelectorAll('#page-category-selection .card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.hash = `#question?category=${card.dataset.category}`;
        });
    });
    document.getElementById('yes-button').addEventListener('click', () => { if(state.category) window.location.hash = `#review?category=${state.category}`; });
    document.getElementById('no-button').addEventListener('click', () => { if(state.category) window.location.hash = `#main?category=${state.category}`; });
    
    // --- PAGE INITIALIZATION FUNCTIONS ---
    function initQuestionPage(){ if(state.category) document.getElementById('question-header').textContent = `For ${state.category.replace("-", " ")}`; }
    function initMainPage(){ if(state.category) { document.getElementById('main-header').textContent = `Reviews for ${state.category.replace("-", " ")}`; document.getElementById('sort-by').onchange = renderReviews; renderReviews(); } }

    function initReviewPage() {
        const form = document.getElementById('review-form');
        const submitButton = document.getElementById('submit-review');
        const starRatingContainer = document.getElementById('star-rating');
        const requiredInputs = [document.getElementById('title'), document.getElementById('comments'), document.getElementById('date-used')];
        
        form.reset();
        document.getElementById('photo-preview').style.display = 'none';
        submitButton.disabled = true;
        state.rating = 0;
        starRatingContainer.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
        if (state.category) {
            document.getElementById('review-header').textContent = `Review Your ${state.category.replace('-', ' ')} Perfume`;
        }

        const checkFormValidity = () => {
            const allInputsFilled = requiredInputs.every(input => input.value.trim() !== '');
            submitButton.disabled = !(state.rating > 0 && allInputsFilled);
        };

        const handleRating = (ratingValue) => {
            state.rating = ratingValue;
            Array.from(starRatingContainer.children).forEach((star, index) => star.classList.toggle('selected', index < ratingValue));
            checkFormValidity();
        };

        starRatingContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                handleRating(parseInt(e.target.dataset.value));
            }
        });
        
        document.getElementById('photo').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('photo-preview').src = event.target.result;
                    document.getElementById('photo-preview').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
        requiredInputs.forEach(input => input.addEventListener('input', checkFormValidity));
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!state.user) {
                alert("You must be logged in to submit.");
                return;
            }
            if (auth.currentUser.providerData.some(p => p.providerId === 'password') && !auth.currentUser.emailVerified) {
                alert("Please verify your email before submitting a review.");
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            try {
                let photoUrl = '';
                const photoFile = document.getElementById('photo').files[0];

                if (photoFile) {
                    submitButton.textContent = 'Uploading Photo...';
                    const formData = new FormData();
                    formData.append('file', photoFile);
                    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                    const response = await fetch(CLOUDINARY_URL, {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        throw new Error('Image upload failed.');
                    }
                    const data = await response.json();
                    photoUrl = data.secure_url;
                }

                const reviewData = {
                    photo: photoUrl,
                    rating: state.rating,
                    title: document.getElementById('title').value.trim(),
                    comments: document.getElementById('comments').value.trim(),
                    dateUsed: document.getElementById('date-used').value,
                    timestamp: new Date(),
                    userId: state.user.id,
                    userName: state.user.name,
                    status: 'pending'
                };
                await addDoc(collection(db, 'reviews', state.category, 'items'), reviewData);
                showThankYouModal("Thank You!", "Your review has been submitted for approval.");
            } catch (error) {
                handleAuthError(error);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Review';
            }
        };
    }

    async function renderReviews() {
        if (!state.category) return;
        const grid = document.getElementById('reviews-grid');
        grid.innerHTML = '<p style="text-align: center;">Loading reviews...</p>';
        try {
            const reviewsRef = collection(db, "reviews", state.category, "items");
            const sortBy = document.getElementById('sort-by').value;
            let field = 'timestamp', direction = 'desc';
            if (sortBy === 'oldest') { direction = 'asc'; } else if (sortBy === 'highest-rating') { field = 'rating'; } else if (sortBy === 'lowest-rating') { field = 'rating'; direction = 'asc'; }
            
            const q = query(reviewsRef, where("status", "==", "approved"), orderBy(field, direction));
            const querySnapshot = await getDocs(q);
            const reviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (reviews.length === 0) {
                grid.innerHTML = '<p style="text-align: center;">No approved reviews yet. Be the first to add one!</p>';
                return;
            }
            grid.innerHTML = "";
            reviews.forEach(review => {
                const card = document.createElement('div');
                card.className = 'review-card';
                if (review.photo) {
                    const img = document.createElement('img');
                    img.src = review.photo;
                    img.alt = review.title || "Review image";
                    card.appendChild(img);
                }
                const content = document.createElement('div');
                content.className = 'review-card-content';
                const starsHTML = Array.from({ length: 5 }, (_, i) => `<span class="star ${i < review.rating ? 'selected' : ''}">&#9733;</span>`).join('');
                const formattedDate = review.timestamp?.toDate()?.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A';
                content.innerHTML = `<h3>${review.title}</h3><div class="date">Added by ${review.userName || "Guest"}</div><div class="review-card-stars">${starsHTML}</div><p>${review.comments}</p><div class="date">Date Added: ${formattedDate}</div>`;
                card.appendChild(content);
                grid.appendChild(card);
            });
        } catch (error) {
            console.error("Error fetching reviews:", error);
            grid.innerHTML = `<p style="text-align: center; color: #ff6b6b;">Error: ${error.message}</p>`;
        }
    }
    
    async function initAdminPage() {
        if (state.user?.id !== ADMIN_UID) {
            alert("Access denied.");
            window.location.hash = "#landing";
            return;
        }
        const grid = document.getElementById('admin-reviews-grid');
        grid.innerHTML = '<p style="text-align:center">Loading pending reviews...</p>';
        const allPendingReviews = [];
        const categories = ["him", "her", "parents", "me"];
        try {
            for (const category of categories) {
                const reviewsRef = collection(db, 'reviews', category, 'items');
                const q = query(reviewsRef, where("status", "==", "pending"), orderBy("timestamp", "desc"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => allPendingReviews.push({ id: doc.id, category: category, ...doc.data() }));
            }
            if (allPendingReviews.length === 0) {
                grid.innerHTML = '<p style="text-align:center">No pending reviews to moderate.</p>';
                return;
            }
            grid.innerHTML = "";
            allPendingReviews.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
            allPendingReviews.forEach(review => {
                const card = document.createElement('div');
                card.className = 'review-card';
                const formattedDate = review.timestamp?.toDate()?.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A';
                card.innerHTML = `
                    ${review.photo ? `<img src="${review.photo}" alt="${review.title || ''}">` : ''}
                    <div class="review-card-content">
                        <h3>${review.title} <span style="font-size: 1rem; color: #aaa;">(${review.category})</span></h3>
                        <div class="date">Submitted by ${review.userName || "Guest"} on ${formattedDate}</div>
                        <div class="review-card-stars">${Array.from({length:5},(_,i)=>`<span class="star ${i<review.rating?"selected":""}">&#9733;</span>`).join("")}</div>
                        <p>${review.comments}</p>
                    </div>
                    <div class="admin-actions">
                        <button class="btn btn-approve" data-id="${review.id}" data-category="${review.category}">Approve</button>
                        <button class="btn btn-reject" data-id="${review.id}" data-category="${review.category}">Reject</button>
                    </div>`;
                grid.appendChild(card);
            });
        } catch (error) {
            console.error("Error fetching pending reviews:", error);
            grid.innerHTML = '<p style="text-align:center;color:red">Failed to load reviews.</p>';
        }

        grid.addEventListener('click', async (e) => {
            const target = e.target;
            if (!target.matches('.btn-approve, .btn-reject')) return;
            target.disabled = true;
            const reviewId = target.dataset.id;
            const category = target.dataset.category;
            const newStatus = target.classList.contains('btn-approve') ? 'approved' : 'rejected';
            if (!reviewId || !category) return;
            const reviewDocRef = doc(db, 'reviews', category, 'items', reviewId);
            try {
                await updateDoc(reviewDocRef, { status: newStatus });
                target.closest('.review-card').style.opacity = '0.5';
                target.closest('.admin-actions').innerHTML = `<p style="text-align: right; font-weight: bold; color: ${newStatus === 'approved' ? 'var(--accent-gold)' : '#aaa'}">${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>`;
            } catch (error) {
                console.error("Error updating review status:", error);
                alert("Failed to update status.");
                target.disabled = false;
            }
        });
    }

    function showThankYouModal(title, message) {
        const modal = document.getElementById('thank-you-modal');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        modal.classList.add('active');
        document.getElementById('close-modal').onclick = () => {
            modal.classList.remove('active');
            if (state.user?.id !== ADMIN_UID) {
                window.location.hash = `#main?category=${state.category || 'her'}`;
            }
        };
    }
});