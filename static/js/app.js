/* =========================================================
   MEDIALERT FRONTEND
   PART 1 / 3
========================================================= */


/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {

    user: JSON.parse(
        localStorage.getItem("medialert_user") || "null"
    ),

    theme:
        localStorage.getItem("medialert_theme")
        || "light",

    currentView: "home",

    sidebarCollapsed:
        localStorage.getItem("medialert_sidebar")
        === "collapsed"

};


/* =========================================================
   DOM REFERENCES
========================================================= */

const authScreen =
    document.getElementById("auth-screen");

const appShell =
    document.getElementById("app-shell");

const loginForm =
    document.getElementById("login-form");

const registerForm =
    document.getElementById("register-form");

const authSwitchButton =
    document.getElementById("auth-switch-button");

const authSwitchText =
    document.getElementById("auth-switch-text");

const authTitle =
    document.getElementById("auth-title");

const authSubtitle =
    document.getElementById("auth-subtitle");

const authMessage =
    document.getElementById("auth-message");


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        applyTheme();

        setupNavigation();

        setupAuthentication();

        setupThemeToggle();

        setupChat();

        setupEmergency();

        setupHospitals();

        setupBlood();

        setupOCR();

        setupPrescription();

        setupSchemes();

        setupGrievance();

        setupNearby();

        setupAccount();

        updateUserUI();

        restoreSidebar();

        if (state.user) {

            showApplication();

        } else {

            showAuth();

        }

    }
);


/* =========================================================
   AUTH SCREEN
========================================================= */

function showApplication() {

    if (!authScreen || !appShell) {
        return;
    }

    authScreen.classList.add("hidden");

    appShell.classList.remove("hidden");

}


function showAuth() {

    if (!authScreen || !appShell) {
        return;
    }

    authScreen.classList.remove("hidden");

    appShell.classList.add("hidden");

}


/* =========================================================
   AUTHENTICATION
========================================================= */

function setupAuthentication() {


    /* -------------------------
       LOGIN
    ------------------------- */

    loginForm?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const email =
                document
                    .getElementById("login-email")
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById("login-password")
                    ?.value;


            if (!email || !password) {

                showAuthMessage(
                    "Please enter email and password."
                );

                return;

            }


            try {

                showAuthMessage(
                    "Signing in...",
                    false
                );


                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email,
                                    password
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok || !result.success) {

                    throw new Error(
                        result.error
                        || "Login failed."
                    );

                }


                state.user =
                    result.user;


                localStorage.setItem(
                    "medialert_user",
                    JSON.stringify(
                        state.user
                    )
                );


                updateUserUI();

                showApplication();

                navigateTo("home");

                showToast(
                    "Welcome to MediAlert."
                );


            } catch (error) {

                showAuthMessage(
                    error.message
                );

            }

        }
    );


    /* -------------------------
       REGISTER
    ------------------------- */

    registerForm?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const name =
                document
                    .getElementById("register-name")
                    ?.value
                    .trim();


            const email =
                document
                    .getElementById("register-email")
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById("register-password")
                    ?.value;


            if (!name || !email || !password) {

                showAuthMessage(
                    "Please complete all fields."
                );

                return;

            }


            try {

                showAuthMessage(
                    "Creating account...",
                    false
                );


                const response =
                    await fetch(
                        "/api/auth/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    name,
                                    email,
                                    password
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok || !result.success) {

                    throw new Error(
                        result.error
                        || "Registration failed."
                    );

                }


                state.user =
                    result.user;


                localStorage.setItem(
                    "medialert_user",
                    JSON.stringify(
                        state.user
                    )
                );


                updateUserUI();

                showApplication();

                navigateTo("home");

                showToast(
                    "Account created successfully."
                );


            } catch (error) {

                showAuthMessage(
                    error.message
                );

            }

        }
    );


    /* -------------------------
       LOGIN / REGISTER SWITCH
    ------------------------- */

    authSwitchButton?.addEventListener(
        "click",
        () => {

            const isLogin =
                !loginForm?.classList.contains(
                    "hidden"
                );


            if (isLogin) {

                loginForm?.classList.add(
                    "hidden"
                );

                registerForm?.classList.remove(
                    "hidden"
                );


                if (authTitle) {

                    authTitle.innerHTML =
                        "Create your <span>MediAlert account.</span>";

                }


                if (authSubtitle) {

                    authSubtitle.textContent =
                        "Create an account to access your healthcare tools.";

                }


                if (authSwitchText) {

                    authSwitchText.textContent =
                        "Already have an account?";

                }


                authSwitchButton.textContent =
                    "Sign in";


            } else {

                registerForm?.classList.add(
                    "hidden"
                );

                loginForm?.classList.remove(
                    "hidden"
                );


                if (authTitle) {

                    authTitle.innerHTML =
                        "Your medical <span>intelligence layer.</span>";

                }


                if (authSubtitle) {

                    authSubtitle.textContent =
                        "Sign in to access your emergency and healthcare tools.";

                }


                if (authSwitchText) {

                    authSwitchText.textContent =
                        "Don't have an account?";

                }


                authSwitchButton.textContent =
                    "Create one";

            }


            showAuthMessage("");

        }
    );


    /* -------------------------
       LOGOUT
    ------------------------- */

    document
        .getElementById("logout-button")
        ?.addEventListener(
            "click",
            logout
        );

}


function logout() {

    state.user = null;

    localStorage.removeItem(
        "medialert_user"
    );

    showAuth();

    showToast(
        "You have been logged out."
    );

}


function showAuthMessage(
    message,
    isError = true
) {

    if (!authMessage) {
        return;
    }

    authMessage.textContent =
        message;

    authMessage.style.color =
        isError
            ? "var(--danger)"
            : "var(--muted)";

}


/* =========================================================
   USER UI
========================================================= */

function updateUserUI() {

    if (!state.user) {
        return;
    }


    const name =
        state.user.name
        || "User";


    const initial =
        name
            .charAt(0)
            .toUpperCase();


    document
        .getElementById("user-name")
        ?.replaceChildren(
            document.createTextNode(name)
        );


    const userInitial =
        document.getElementById(
            "user-initial"
        );

    if (userInitial) {

        userInitial.textContent =
            initial;

    }


    const accountName =
        document.getElementById(
            "account-name"
        );

    if (accountName) {

        accountName.textContent =
            name;

    }


    /* Email deliberately hidden from UI */

    const accountEmail =
        document.getElementById(
            "account-email"
        );

    if (accountEmail) {

        accountEmail.textContent =
            "";

        accountEmail.style.display =
            "none";

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(
            (element) => {

                element.addEventListener(
                    "click",
                    (event) => {

                        event.preventDefault();

                        const view =
                            element.dataset.view;

                        if (!view) {
                            return;
                        }

                        navigateTo(view);


                        /* Close mobile sidebar */

                        if (
                            window.innerWidth <= 900
                        ) {

                            document
                                .getElementById(
                                    "sidebar"
                                )
                                ?.classList.remove(
                                    "open"
                                );

                        }

                    }
                );

            }
        );


    /* =====================================================
       SIDEBAR TOGGLE
    ===================================================== */

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const menuButton =
        document.getElementById(
            "mobile-menu"
        );


    const sidebarToggle =
        document.getElementById(
            "sidebar-toggle"
        );


    const toggleSidebar =
        () => {

            if (!sidebar) {
                return;
            }


            if (
                window.innerWidth <= 900
            ) {

                sidebar.classList.toggle(
                    "open"
                );

                return;

            }


            sidebar.classList.toggle(
                "collapsed"
            );


            state.sidebarCollapsed =
                sidebar.classList.contains(
                    "collapsed"
                );


            localStorage.setItem(
                "medialert_sidebar",
                state.sidebarCollapsed
                    ? "collapsed"
                    : "open"
            );

        };


    menuButton?.addEventListener(
        "click",
        toggleSidebar
    );


    sidebarToggle?.addEventListener(
        "click",
        toggleSidebar
    );

}


/* =========================================================
   REAL PAGE NAVIGATION
   THIS WAS MISSING IN YOUR OLD JS
========================================================= */

function navigateTo(viewName) {

    if (!viewName) {
        return;
    }


    const target =
        document.getElementById(
            `view-${viewName}`
        );


    if (!target) {

        console.warn(
            `MediAlert: view-${viewName} not found.`
        );

        return;

    }


    /* Hide every page */

    document
        .querySelectorAll(
            ".page-view"
        )
        .forEach(
            (view) => {

                view.classList.remove(
                    "active-view"
                );

            }
        );


    /* Show selected page */

    target.classList.add(
        "active-view"
    );


    /* Update sidebar active state */

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            (item) => {

                item.classList.toggle(
                    "active",
                    item.dataset.view
                    === viewName
                );

            }
        );


    state.currentView =
        viewName;


    /* Keep URL clean but bookmarkable */

    try {

        history.replaceState(
            null,
            "",
            `#${viewName}`
        );

    } catch (error) {

        console.warn(
            "History update failed:",
            error
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   RESTORE SIDEBAR
========================================================= */

function restoreSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    if (!sidebar) {
        return;
    }


    if (
        window.innerWidth > 900
        &&
        state.sidebarCollapsed
    ) {

        sidebar.classList.add(
            "collapsed"
        );

    }

}


/* =========================================================
   HASH NAVIGATION
========================================================= */

window.addEventListener(
    "hashchange",
    () => {

        const view =
            window.location.hash
                .replace("#", "")
                .trim();


        if (
            view
            &&
            document.getElementById(
                `view-${view}`
            )
        ) {

            navigateTo(view);

        }

    }
);


/* =========================================================
   INITIAL HASH
========================================================= */

function loadInitialView() {

    const hash =
        window.location.hash
            .replace("#", "")
            .trim();


    if (
        hash
        &&
        document.getElementById(
            `view-${hash}`
        )
    ) {

        navigateTo(hash);

    } else {

        navigateTo("home");

    }

}

/* =========================================================
   MEDIALERT FRONTEND
   PART 2 / 3
========================================================= */


/* =========================================================
   THEME
========================================================= */

function applyTheme() {

    document.documentElement.setAttribute(
        "data-theme",
        state.theme
    );


    if (state.theme === "dark") {

        document.body.classList.add(
            "dark-theme"
        );

    } else {

        document.body.classList.remove(
            "dark-theme"
        );

    }


    const themeLabel =
        document.getElementById(
            "theme-label"
        );


    if (themeLabel) {

        themeLabel.textContent =
            state.theme === "dark"
                ? "Light mode"
                : "Dark mode";

    }

}


function toggleTheme() {

    state.theme =
        state.theme === "light"
            ? "dark"
            : "light";


    localStorage.setItem(
        "medialert_theme",
        state.theme
    );


    applyTheme();

}


function setupThemeToggle() {

    document
        .getElementById(
            "theme-toggle"
        )
        ?.addEventListener(
            "click",
            toggleTheme
        );


    document
        .getElementById(
            "top-theme-toggle"
        )
        ?.addEventListener(
            "click",
            toggleTheme
        );


    document
        .getElementById(
            "account-theme-toggle"
        )
        ?.addEventListener(
            "click",
            toggleTheme
        );

}


/* =========================================================
   AI CHAT
========================================================= */

function setupChat() {

    const input =
        document.getElementById(
            "chat-input"
        );


    const sendButton =
        document.getElementById(
            "send-chat"
        );


    const voiceButton =
        document.getElementById(
            "voice-input"
        );


    sendButton?.addEventListener(
        "click",
        sendChat
    );


    input?.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter"
                &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendChat();

            }

        }
    );


    voiceButton?.addEventListener(
        "click",
        startVoiceInput
    );

}


async function sendChat() {

    const input =
        document.getElementById(
            "chat-input"
        );


    const message =
        input?.value.trim();


    if (!message) {

        showToast(
            "Type a question first."
        );

        return;

    }


    addUserMessage(
        message
    );


    input.value = "";


    const typing =
        addTypingMessage();


    try {

        const response =
            await fetch(
                "/api/ai/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            message: message
                        })
                }
            );


        const result =
            await response.json();


        typing?.remove();


        if (
            !response.ok
            ||
            !result.success
        ) {

            throw new Error(
                result.error
                ||
                "AI request failed."
            );

        }


        addAssistantMessage(
            result.answer
            ||
            "No answer was returned."
        );


        if (
            result.sources
            &&
            Array.isArray(
                result.sources
            )
            &&
            result.sources.length
        ) {

            addSources(
                result.sources
            );

        }


        /* Optional voice output */

        if (
            result.audio
        ) {

            playAIResponseAudio(
                result.audio
            );

        }


    } catch (error) {

        typing?.remove();


        addAssistantMessage(
            "I couldn't process that request right now. "
            + error.message
        );

    }

}


function addUserMessage(
    message
) {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "user-message";


    wrapper.innerHTML = `
        <div class="user-message-bubble">
            ${escapeHTML(message)}
        </div>
    `;


    container.appendChild(
        wrapper
    );


    scrollChatToBottom();

}


function addAssistantMessage(
    message
) {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "assistant-message";


    wrapper.innerHTML = `
        <div class="message-avatar">
            ✦
        </div>

        <div class="assistant-message-content">

            <strong>
                MediAlert AI
            </strong>

            <p>
                ${escapeHTML(message)}
            </p>

            <small>
                ⚠ Verify important medical
                information with a healthcare professional.
            </small>

        </div>
    `;


    container.appendChild(
        wrapper
    );


    scrollChatToBottom();

}


function addTypingMessage() {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return null;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "assistant-message typing-message";


    wrapper.innerHTML = `
        <div class="message-avatar">
            ✦
        </div>

        <div>

            <strong>
                MediAlert AI
            </strong>

            <p>
                Thinking<span class="typing-dots">...</span>
            </p>

        </div>
    `;


    container.appendChild(
        wrapper
    );


    scrollChatToBottom();


    return wrapper;

}


function addSources(
    sources
) {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return;
    }


    const block =
        document.createElement(
            "div"
        );


    block.className =
        "sources-card";


    const sourceItems =
        sources
            .map(
                (source) => {

                    if (
                        typeof source === "object"
                        &&
                        source !== null
                    ) {

                        return `
                            <li>
                                ${escapeHTML(
                                    source.title
                                    ||
                                    source.name
                                    ||
                                    source.source
                                    ||
                                    JSON.stringify(source)
                                )}
                            </li>
                        `;

                    }


                    return `
                        <li>
                            ${escapeHTML(
                                String(source)
                            )}
                        </li>
                    `;

                }
            )
            .join("");


    block.innerHTML = `
        <small>
            SOURCES
        </small>

        <ul>
            ${sourceItems}
        </ul>
    `;


    container.appendChild(
        block
    );


    scrollChatToBottom();

}


function scrollChatToBottom() {

    const container =
        document.getElementById(
            "chat-messages"
        );


    if (!container) {
        return;
    }


    container.scrollTop =
        container.scrollHeight;

}


/* =========================================================
   VOICE INPUT
   Hindi + English + Hinglish
========================================================= */

function startVoiceInput() {

    const SpeechRecognition =
        window.SpeechRecognition
        ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        showToast(
            "Voice input is not supported in this browser."
        );

        return;

    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-IN";


    recognition.interimResults =
        false;


    recognition.continuous =
        false;


    recognition.maxAlternatives =
        1;


    recognition.onstart =
        () => {

            showToast(
                "Listening... Speak now."
            );

        };


    recognition.onresult =
        (event) => {

            const text =
                event
                    .results[0][0]
                    .transcript;


            const input =
                document.getElementById(
                    "chat-input"
                );


            if (input) {

                input.value =
                    text;

                input.focus();

            }

        };


    recognition.onerror =
        (event) => {

            console.error(
                "Speech recognition error:",
                event.error
            );


            showToast(
                "Voice input failed."
            );

        };


    recognition.onend =
        () => {

            console.log(
                "Voice recognition ended."
            );

        };


    try {

        recognition.start();

    } catch (error) {

        console.error(
            error
        );

    }

}


/* =========================================================
   OPTIONAL AI AUDIO OUTPUT
========================================================= */

function playAIResponseAudio(
    audioData
) {

    try {

        let audioSource =
            audioData;


        if (
            typeof audioData === "string"
            &&
            !audioData.startsWith("data:")
        ) {

            audioSource =
                `data:audio/mpeg;base64,${audioData}`;

        }


        const audio =
            new Audio(
                audioSource
            );


        audio.play()
            .catch(
                error => {

                    console.warn(
                        "Audio playback blocked:",
                        error
                    );

                }
            );

    } catch (error) {

        console.error(
            "Audio output error:",
            error
        );

    }

}


/* =========================================================
   EMERGENCY SOS
========================================================= */

function setupEmergency() {

    document
        .getElementById(
            "sos-button"
        )
        ?.addEventListener(
            "click",
            activateSOS
        );

}


async function activateSOS() {

    const result =
        document.getElementById(
            "sos-result"
        );


    if (!result) {
        return;
    }


    result.innerHTML = `
        <strong>
            Requesting your location...
        </strong>
        <p>
            Please allow location access.
        </p>
    `;


    if (
        !navigator.geolocation
    ) {

        result.innerHTML = `
            <strong>
                Location unavailable
            </strong>

            <p>
                Your browser does not support
                location services.
            </p>
        `;

        return;

    }


    navigator.geolocation.getCurrentPosition(

        async (position) => {

            const latitude =
                position.coords.latitude;


            const longitude =
                position.coords.longitude;


            result.innerHTML = `
                <strong>
                    Location detected.
                </strong>

                <p>
                    Preparing emergency response...
                </p>
            `;


            try {

                const response =
                    await fetch(
                        "/api/emergency/sos",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    latitude,
                                    longitude
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok
                    ||
                    !data.success
                ) {

                    throw new Error(
                        data.error
                        ||
                        "Emergency service unavailable."
                    );

                }


                result.innerHTML = `
                    <div class="sos-success">

                        <strong>
                            ✓ Emergency request prepared
                        </strong>

                        <p>
                            Location:
                            ${latitude.toFixed(5)},
                            ${longitude.toFixed(5)}
                        </p>

                        ${
                            data.hospital
                            ?
                            `
                                <p>
                                    Suggested hospital:
                                    ${escapeHTML(
                                        data.hospital.name
                                        ||
                                        data.hospital
                                    )}
                                </p>
                            `
                            :
                            ""
                        }

                        ${
                            data.route_url
                            ?
                            `
                                <a
                                    href="${escapeHTML(
                                        data.route_url
                                    )}"
                                    target="_blank"
                                    rel="noopener"
                                    class="primary-button"
                                >
                                    Open Route →
                                </a>
                            `
                            :
                            ""
                        }

                    </div>
                `;


                showToast(
                    "Emergency location captured."
                );


            } catch (error) {

                result.innerHTML = `
                    <strong>
                        Location captured
                    </strong>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                    <p>
                        Coordinates:
                        ${latitude.toFixed(5)},
                        ${longitude.toFixed(5)}
                    </p>
                `;

            }

        },


        (error) => {

            console.error(
                "Geolocation error:",
                error
            );


            let message =
                "Location permission was denied or unavailable.";


            if (
                error.code ===
                error.TIMEOUT
            ) {

                message =
                    "Location request timed out.";

            }


            result.innerHTML = `
                <strong>
                    ⚠ Unable to get location
                </strong>

                <p>
                    ${message}
                </p>
            `;

        },


        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }

    );

}


/* =========================================================
   SMART HOSPITALS
========================================================= */

function setupHospitals() {

    const searchButton =
        document.getElementById(
            "hospital-search-button"
        );


    const searchInput =
        document.getElementById(
            "hospital-search"
        );


    searchButton?.addEventListener(
        "click",
        searchHospitals
    );


    searchInput?.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                searchHospitals();

            }

        }
    );

}


async function searchHospitals() {

    const input =
        document.getElementById(
            "hospital-search"
        );


    const type =
        document.getElementById(
            "hospital-type"
        );


    const results =
        document.getElementById(
            "hospital-results"
        );


    if (!results) {
        return;
    }


    const query =
        input?.value.trim()
        || "";


    const facilityType =
        type?.value
        || "";


    results.innerHTML = `
        <div class="empty-state">

            <span>
                ⌛
            </span>

            <h3>
                Searching hospitals...
            </h3>

            <p>
                Checking the Lucknow healthcare dataset.
            </p>

        </div>
    `;


    try {

        const params =
            new URLSearchParams();


        if (query) {

            params.set(
                "query",
                query
            );

        }


        if (facilityType) {

            params.set(
                "type",
                facilityType
            );

        }


        const response =
            await fetch(
                `/api/hospitals/?${params.toString()}`
            );


        const result =
            await response.json();


        if (
            !response.ok
            ||
            !result.success
        ) {

            throw new Error(
                result.error
                ||
                "Unable to load hospitals."
            );

        }


        const hospitals =
            Array.isArray(
                result.hospitals
            )
                ?
                result.hospitals
                :
                [];


        const count =
            document.getElementById(
                "hospital-count"
            );


        if (count) {

            count.textContent =
                hospitals.length;

        }


        if (!hospitals.length) {

            results.innerHTML = `
                <div class="empty-state">

                    <span>
                        🏥
                    </span>

                    <h3>
                        No hospitals found
                    </h3>

                    <p>
                        Try another hospital name,
                        area or facility type.
                    </p>

                </div>
            `;

            return;

        }


        results.innerHTML =
            hospitals
                .map(
                    (hospital, index) =>
                        createHospitalCard(
                            hospital,
                            index
                        )
                )
                .join("");


    } catch (error) {

        console.error(
            "Hospital search error:",
            error
        );


        results.innerHTML = `
            <div class="empty-state">

                <span>
                    ⚠
                </span>

                <h3>
                    Unable to load hospitals
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>
        `;

    }

}


function createHospitalCard(
    hospital,
    index
) {

    const name =
        hospital.name
        ||
        hospital.hospital_name
        ||
        hospital.hospital
        ||
        "Hospital";


    const address =
        hospital.address
        ||
        hospital.location
        ||
        hospital.area
        ||
        "Lucknow";


    const type =
        hospital.type
        ||
        hospital.category
        ||
        "Healthcare Facility";


    const phone =
        hospital.phone
        ||
        hospital.contact
        ||
        "";


    const latitude =
        hospital.latitude
        ||
        hospital.lat;


    const longitude =
        hospital.longitude
        ||
        hospital.lng;


    let routeButton =
        "";


    if (
        latitude !== undefined
        &&
        longitude !== undefined
    ) {

        const mapsUrl =
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${latitude},${longitude}`
            )}`;


        routeButton = `
            <a
                href="${mapsUrl}"
                target="_blank"
                rel="noopener"
                class="secondary-button"
            >
                Route →
            </a>
        `;

    }


    return `
        <article class="information-card hospital-card">

            <div class="hospital-card-top">

                <span class="hospital-number">
                    ${String(
                        index + 1
                    ).padStart(
                        2,
                        "0"
                    )}
                </span>

                <span class="hospital-type">
                    ${escapeHTML(
                        type
                    )}
                </span>

            </div>


            <h3>
                ${escapeHTML(
                    name
                )}
            </h3>


            <p>
                📍
                ${escapeHTML(
                    address
                )}
            </p>


            ${
                phone
                ?
                `
                    <p>
                        ☎
                        ${escapeHTML(
                            phone
                        )}
                    </p>
                `
                :
                ""
            }


            <div class="hospital-card-actions">

                ${routeButton}

            </div>

        </article>
    `;

}


/* =========================================================
   BLOOD SUPPORT
========================================================= */

function setupBlood() {

    document
        .getElementById(
            "register-donor"
        )
        ?.addEventListener(
            "click",
            registerDonor
        );


    document
        .getElementById(
            "request-blood-button"
        )
        ?.addEventListener(
            "click",
            createBloodRequest
        );


    /* Blood tabs */

    document
        .querySelectorAll(
            "[data-blood-tab]"
        )
        .forEach(
            (tab) => {

                tab.addEventListener(
                    "click",
                    () => {

                        const target =
                            tab.dataset.bloodTab;


                        document
                            .querySelectorAll(
                                ".blood-tab"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        tab.classList.add(
                            "active"
                        );


                        document
                            .getElementById(
                                "blood-donor-panel"
                            )
                            ?.classList.toggle(
                                "active",
                                target === "donor"
                            );


                        document
                            .getElementById(
                                "blood-request-panel"
                            )
                            ?.classList.toggle(
                                "active",
                                target === "request"
                            );

                    }
                );

            }
        );

}


async function registerDonor() {

    const name =
        document
            .getElementById(
                "donor-name"
            )
            ?.value
            .trim();


    const bloodGroup =
        document
            .getElementById(
                "donor-blood"
            )
            ?.value;


    const phone =
        document
            .getElementById(
                "donor-phone"
            )
            ?.value
            .trim();


    const location =
        document
            .getElementById(
                "donor-location"
            )
            ?.value
            .trim();


    const consent =
        document
            .getElementById(
                "donor-consent"
            )
            ?.checked;


    const result =
        document.getElementById(
            "donor-result"
        );


    if (
        !name
        ||
        !bloodGroup
        ||
        !phone
        ||
        !consent
    ) {

        if (result) {

            result.textContent =
                "Please complete all required fields and give consent.";

        }

        return;

    }


    try {

        const response =
            await fetch(
                "/api/blood/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            name,

                            blood_group:
                                bloodGroup,

                            phone,

                            location

                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
            ||
            !data.success
        ) {

            throw new Error(
                data.error
                ||
                "Donor registration failed."
            );

        }


        if (result) {

            result.innerHTML = `
                <strong>
                    ✓ Donor registration received.
                </strong>

                <p>
                    Your blood-support registration
                    has been submitted successfully.
                </p>
            `;

        }


        showToast(
            "Donor registration successful."
        );


    } catch (error) {

        if (result) {

            result.textContent =
                error.message;

        }

    }

}


async function createBloodRequest() {

    const name =
        document
            .getElementById(
                "request-name"
            )
            ?.value
            .trim();


    const bloodGroup =
        document
            .getElementById(
                "request-blood"
            )
            ?.value;


    const hospital =
        document
            .getElementById(
                "request-hospital"
            )
            ?.value
            .trim();


    const units =
        document
            .getElementById(
                "request-units"
            )
            ?.value;


    const phone =
        document
            .getElementById(
                "request-phone"
            )
            ?.value
            .trim();


    const result =
        document.getElementById(
            "blood-result"
        );


    if (
        !name
        ||
        !bloodGroup
        ||
        !hospital
        ||
        !units
        ||
        !phone
    ) {

        if (result) {

            result.textContent =
                "Please complete all blood-request fields.";

        }

        return;

    }


    try {

        const response =
            await fetch(
                "/api/blood/request",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            name,

                            blood_group:
                                bloodGroup,

                            hospital,

                            units:
                                Number(units),

                            phone

                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
            ||
            !data.success
        ) {

            throw new Error(
                data.error
                ||
                "Blood request failed."
            );

        }


        if (result) {

            result.innerHTML = `
                <strong>
                    ✓ Blood request created.
                </strong>

                <p>
                    Your request has been submitted
                    to the blood-support system.
                </p>
            `;

        }


        showToast(
            "Blood request created."
        );


    } catch (error) {

        if (result) {

            result.textContent =
                error.message;

        }

    }

}

/* =========================================================
   MEDIALERT FRONTEND
   PART 3 / 3
========================================================= */


/* =========================================================
   OCR
========================================================= */

let ocrCameraStream = null;


function setupOCR() {

    const chooseButton =
        document.getElementById(
            "ocr-choose"
        );

    const fileInput =
        document.getElementById(
            "ocr-file"
        );

    const cameraButton =
        document.getElementById(
            "ocr-camera-button"
        );

    const captureButton =
        document.getElementById(
            "ocr-capture"
        );

    const stopCameraButton =
        document.getElementById(
            "ocr-stop-camera"
        );

    const analyseButton =
        document.getElementById(
            "ocr-analyse"
        );


    chooseButton?.addEventListener(
        "click",
        () => {

            fileInput?.click();

        }
    );


    fileInput?.addEventListener(
        "change",
        handleOCRFile
    );


    cameraButton?.addEventListener(
        "click",
        startOCRCamera
    );


    captureButton?.addEventListener(
        "click",
        captureOCRImage
    );


    stopCameraButton?.addEventListener(
        "click",
        stopOCRCamera
    );


    analyseButton?.addEventListener(
        "click",
        analyseOCR
    );


    /* Drag & drop */

    const dropzone =
        document.getElementById(
            "ocr-dropzone"
        );


    if (dropzone) {

        dropzone.addEventListener(
            "dragover",
            (event) => {

                event.preventDefault();

                dropzone.classList.add(
                    "drag-over"
                );

            }
        );


        dropzone.addEventListener(
            "dragleave",
            () => {

                dropzone.classList.remove(
                    "drag-over"
                );

            }
        );


        dropzone.addEventListener(
            "drop",
            (event) => {

                event.preventDefault();

                dropzone.classList.remove(
                    "drag-over"
                );


                const files =
                    event.dataTransfer.files;


                if (
                    files
                    &&
                    files.length
                ) {

                    fileInput.files =
                        files;

                    handleOCRFile();

                }

            }
        );

    }

}


function handleOCRFile() {

    const fileInput =
        document.getElementById(
            "ocr-file"
        );


    const file =
        fileInput?.files?.[0];


    if (!file) {
        return;
    }


    const result =
        document.getElementById(
            "ocr-result"
        );


    const preview =
        document.getElementById(
            "ocr-preview"
        );


    const previewImage =
        document.getElementById(
            "ocr-preview-image"
        );


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        if (result) {

            result.innerHTML = `
                <div class="empty-state">

                    <span>⚠</span>

                    <h3>
                        Image required
                    </h3>

                    <p>
                        Please select an image
                        document for OCR.
                    </p>

                </div>
            `;

        }

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        (event) => {

            if (
                previewImage
            ) {

                previewImage.src =
                    event.target.result;

            }


            preview?.classList.remove(
                "hidden"
            );


            if (result) {

                result.innerHTML = `
                    <div class="empty-state">

                        <span>✓</span>

                        <h3>
                            Document selected
                        </h3>

                        <p>
                            Click
                            <strong>
                                Scan & Analyse Document
                            </strong>
                            to continue.
                        </p>

                    </div>
                `;

            }

        };


    reader.readAsDataURL(
        file
    );

}


async function startOCRCamera() {

    const video =
        document.getElementById(
            "ocr-camera"
        );


    const cameraBox =
        document.getElementById(
            "camera-box"
        );


    const captureButton =
        document.getElementById(
            "ocr-capture"
        );


    const stopButton =
        document.getElementById(
            "ocr-stop-camera"
        );


    const cameraButton =
        document.getElementById(
            "ocr-camera-button"
        );


    if (!navigator.mediaDevices?.getUserMedia) {

        showToast(
            "Camera is not supported by this browser."
        );

        return;

    }


    try {

        ocrCameraStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode: {
                            ideal: "environment"
                        }
                    },

                    audio: false
                }
            );


        if (video) {

            video.srcObject =
                ocrCameraStream;

        }


        cameraBox?.classList.remove(
            "hidden"
        );


        captureButton?.classList.remove(
            "hidden"
        );


        stopButton?.classList.remove(
            "hidden"
        );


        cameraButton?.classList.add(
            "hidden"
        );


        showToast(
            "Camera started."
        );


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        showToast(
            "Camera permission was denied or unavailable."
        );

    }

}


function captureOCRImage() {

    const video =
        document.getElementById(
            "ocr-camera"
        );


    if (
        !video
        ||
        !video.videoWidth
    ) {

        showToast(
            "Camera is not ready yet."
        );

        return;

    }


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        video.videoWidth;


    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    canvas.toBlob(
        (blob) => {

            if (!blob) {

                showToast(
                    "Unable to capture image."
                );

                return;

            }


            const file =
                new File(
                    [blob],
                    `medialert-camera-${Date.now()}.jpg`,
                    {
                        type:
                            "image/jpeg"
                    }
                );


            const fileInput =
                document.getElementById(
                    "ocr-file"
                );


            const dataTransfer =
                new DataTransfer();


            dataTransfer.items.add(
                file
            );


            if (fileInput) {

                fileInput.files =
                    dataTransfer.files;

            }


            handleOCRFile();

            stopOCRCamera();

            showToast(
                "Document captured."
            );

        },

        "image/jpeg",

        0.92
    );

}


function stopOCRCamera() {

    if (ocrCameraStream) {

        ocrCameraStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        ocrCameraStream =
            null;

    }


    const video =
        document.getElementById(
            "ocr-camera"
        );


    if (video) {

        video.srcObject =
            null;

    }


    document
        .getElementById(
            "camera-box"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "ocr-capture"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "ocr-stop-camera"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "ocr-camera-button"
        )
        ?.classList.remove(
            "hidden"
        );

}


async function analyseOCR() {

    const fileInput =
        document.getElementById(
            "ocr-file"
        );


    const file =
        fileInput?.files?.[0];


    const result =
        document.getElementById(
            "ocr-result"
        );


    if (!file) {

        if (result) {

            result.innerHTML = `
                <div class="empty-state">

                    <span>
                        ▣
                    </span>

                    <h3>
                        No document selected
                    </h3>

                    <p>
                        Upload an image or capture
                        one using the camera first.
                    </p>

                </div>
            `;

        }

        return;

    }


    if (result) {

        result.innerHTML = `
            <div class="empty-state">

                <span>
                    ⌛
                </span>

                <h3>
                    Analysing document...
                </h3>

                <p>
                    MediAlert is processing the
                    medical document.
                </p>

            </div>
        `;

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                "/api/medical/ocr",
                {
                    method: "POST",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
            ||
            !data.success
        ) {

            throw new Error(
                data.error
                ||
                "OCR analysis failed."
            );

        }


        if (result) {

            result.innerHTML = `

                <div class="ocr-success-card">

                    <div class="ocr-success-icon">
                        ✓
                    </div>

                    <div>

                        <span class="eyebrow">
                            MEDICAL OCR
                        </span>

                        <h3>
                            Document analysed
                        </h3>

                        <p>
                            ${escapeHTML(
                                data.filename
                                ||
                                file.name
                            )}
                        </p>

                    </div>

                </div>


                <div class="medical-warning">

                    <strong>
                        ⚠ Medical information warning
                    </strong>

                    <p>
                        OCR and AI analysis may contain
                        errors. Verify important information
                        with the original document and a
                        qualified healthcare professional.
                    </p>

                </div>


                ${
                    data.text
                    ?
                    `
                        <div class="ocr-text-card">

                            <span class="eyebrow">
                                EXTRACTED INFORMATION
                            </span>

                            <p>
                                ${escapeHTML(
                                    data.text
                                )}
                            </p>

                        </div>
                    `
                    :
                    ""
                }

            `;

        }


        showToast(
            "Document analysed successfully."
        );


    } catch (error) {

        console.error(
            "OCR error:",
            error
        );


        if (result) {

            result.innerHTML = `

                <div class="empty-state">

                    <span>
                        ⚠
                    </span>

                    <h3>
                        OCR analysis failed
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>

            `;

        }

    }

}


/* =========================================================
   PRESCRIPTION
========================================================= */

function setupPrescription() {

    const fileInput =
        document.getElementById(
            "prescription-file"
        );


    const chooseButton =
        document.getElementById(
            "prescription-choose"
        );


    const analyseButton =
        document.getElementById(
            "prescription-analyse"
        );


    chooseButton?.addEventListener(
        "click",
        () => {

            fileInput?.click();

        }
    );


    fileInput?.addEventListener(
        "change",
        () => {

            const file =
                fileInput.files?.[0];


            const status =
                document.getElementById(
                    "prescription-status"
                );


            if (file && status) {

                status.textContent =
                    `Selected: ${file.name}`;

            }

        }
    );


    analyseButton?.addEventListener(
        "click",
        analysePrescription
    );

}


async function analysePrescription() {

    const fileInput =
        document.getElementById(
            "prescription-file"
        );


    const file =
        fileInput?.files?.[0];


    const result =
        document.getElementById(
            "prescription-result"
        );


    if (!file) {

        if (result) {

            result.innerHTML = `
                <div class="empty-state">

                    <span>Rx</span>

                    <h3>
                        Select a prescription
                    </h3>

                    <p>
                        Upload a prescription first.
                    </p>

                </div>
            `;

        }

        return;

    }


    if (result) {

        result.innerHTML = `
            <div class="empty-state">

                <span>
                    ⌛
                </span>

                <h3>
                    Reading prescription...
                </h3>

                <p>
                    Extracting available medical information.
                </p>

            </div>
        `;

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                "/api/medical/prescription",
                {
                    method: "POST",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
            ||
            !data.success
        ) {

            throw new Error(
                data.error
                ||
                "Prescription analysis failed."
            );

        }


        const text =
            data.text
            ||
            data.analysis
            ||
            data.answer
            ||
            "No readable information returned.";


        if (result) {

            result.innerHTML = `

                <div class="prescription-summary">

                    <div class="prescription-summary-icon">
                        Rx
                    </div>

                    <div>

                        <small>
                            ANALYSIS COMPLETE
                        </small>

                        <h3>
                            Prescription information
                        </h3>

                    </div>

                </div>


                <div class="prescription-text">
                    ${escapeHTML(text)}
                </div>


                <div class="medical-warning">

                    <strong>
                        ⚠ Do not self-medicate
                    </strong>

                    <p>
                        Verify medicine names,
                        dosage and instructions with
                        your doctor or pharmacist.
                    </p>

                </div>

            `;

        }


        showToast(
            "Prescription analysed."
        );


    } catch (error) {

        if (result) {

            result.innerHTML = `
                <div class="empty-state">

                    <span>⚠</span>

                    <h3>
                        Analysis failed
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>
            `;

        }

    }

}


/* =========================================================
   GOVERNMENT SCHEMES
========================================================= */

function setupSchemes() {

    document
        .getElementById(
            "find-schemes"
        )
        ?.addEventListener(
            "click",
            findSchemes
        );

}


async function findSchemes() {

    const age =
        document
            .getElementById(
                "scheme-age"
            )
            ?.value;


    const occupation =
        document
            .getElementById(
                "scheme-occupation"
            )
            ?.value;


    const category =
        document
            .getElementById(
                "scheme-category"
            )
            ?.value;


    const income =
        document
            .getElementById(
                "scheme-income"
            )
            ?.value;


    const gender =
        document
            .getElementById(
                "scheme-gender"
            )
            ?.value;


    const results =
        document.getElementById(
            "scheme-results"
        );


    if (!results) {
        return;
    }


    results.innerHTML = `
        <div class="empty-state">

            <span>
                ⌛
            </span>

            <h3>
                Finding matching schemes...
            </h3>

            <p>
                Checking the available healthcare scheme data.
            </p>

        </div>
    `;


    try {

        const response =
            await fetch(
                "/api/schemes/match",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            age:
                                Number(age),

                            occupation,

                            category,

                            income:
                                Number(income),

                            gender

                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
            ||
            !data.success
        ) {

            throw new Error(
                data.error
                ||
                "Scheme search failed."
            );

        }


        const schemes =
            Array.isArray(
                data.schemes
            )
                ?
                data.schemes
                :
                [];


        if (!schemes.length) {

            results.innerHTML = `
                <div class="empty-state">

                    <span>
                        🏛
                    </span>

                    <h3>
                        No matching schemes found
                    </h3>

                    <p>
                        Try different profile information
                        or check the scheme database.
                    </p>

                </div>
            `;

            return;

        }


        results.innerHTML =
            schemes
                .map(
                    createSchemeCard
                )
                .join("");


    } catch (error) {

        results.innerHTML = `
            <div class="empty-state">

                <span>
                    ⚠
                </span>

                <h3>
                    Unable to find schemes
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>
        `;

    }

}


function createSchemeCard(
    scheme
) {

    const name =
        scheme.name
        ||
        scheme.title
        ||
        "Government Health Scheme";


    const description =
        scheme.description
        ||
        scheme.details
        ||
        "Scheme information available.";


    const eligibility =
        scheme.eligibility
        ||
        scheme.criteria
        ||
        "";


    const link =
        scheme.url
        ||
        scheme.link
        ||
        "";


    return `
        <article class="scheme-card">

            <div class="scheme-card-top">

                <span>
                    GOVERNMENT SCHEME
                </span>

                <strong>
                    ✓ MATCH
                </strong>

            </div>


            <h3>
                ${escapeHTML(
                    name
                )}
            </h3>


            <p>
                ${escapeHTML(
                    description
                )}
            </p>


            ${
                eligibility
                ?
                `
                    <div class="scheme-eligibility">

                        <small>
                            ELIGIBILITY
                        </small>

                        <p>
                            ${escapeHTML(
                                eligibility
                            )}
                        </p>

                    </div>
                `
                :
                ""
            }


            ${
                link
                ?
                `
                    <a
                        href="${escapeHTML(
                            link
                        )}"
                        target="_blank"
                        rel="noopener"
                        class="secondary-button"
                    >
                        View official details →
                    </a>
                `
                :
                ""
            }

        </article>
    `;

}


/* =========================================================
   GRIEVANCE
========================================================= */

function setupGrievance() {

    document
        .querySelectorAll(
            ".grievance-type"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".grievance-type"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        const category =
                            button.dataset.grievance;


                        const select =
                            document.getElementById(
                                "complaint-category"
                            );


                        if (
                            select
                            &&
                            category
                        ) {

                            select.value =
                                category;

                        }

                    }
                );

            }
        );


    document
        .getElementById(
            "generate-complaint"
        )
        ?.addEventListener(
            "click",
            generateComplaint
        );

}


async function generateComplaint() {

    const name =
        document
            .getElementById(
                "complaint-name"
            )
            ?.value
            .trim();


    const district =
        document
            .getElementById(
                "complaint-district"
            )
            ?.value
            .trim();


    const block =
        document
            .getElementById(
                "complaint-block"
            )
            ?.value
            .trim();


    const village =
        document
            .getElementById(
                "complaint-village"
            )
            ?.value
            .trim();


    const category =
        document
            .getElementById(
                "complaint-category"
            )
            ?.value;


    const description =
        document
            .getElementById(
                "complaint-description"
            )
            ?.value
            .trim();


    const date =
        document
            .getElementById(
                "complaint-date"
            )
            ?.value;


    const complaintNumber =
        document
            .getElementById(
                "complaint-number"
            )
            ?.value
            .trim();


    const result =
        document.getElementById(
            "complaint-result"
        );


    if (
        !name
        ||
        !description
    ) {

        if (result) {

            result.innerHTML = `
                <div class="medical-warning">

                    <strong>
                        Please complete the required fields.
                    </strong>

                    <p>
                        Name and issue description
                        are required.
                    </p>

                </div>
            `;

        }

        return;

    }


    if (result) {

        result.innerHTML = `
            <div class="empty-state">

                <span>
                    ⌛
                </span>

                <h3>
                    Preparing complaint...
                </h3>

            </div>
        `;

    }


    try {

        const response =
            await fetch(
                "/api/grievance/create",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            name,

                            district,

                            block,

                            village,

                            category,

                            description,

                            date,

                            complaint_number:
                                complaintNumber

                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok
            ||
            !data.success
        ) {

            throw new Error(
                data.error
                ||
                "Complaint creation failed."
            );

        }


        const draft =
            data.draft
            ||
            data.complaint
            ||
            data.message
            ||
            "Complaint draft created.";


        if (result) {

            result.innerHTML = `

                <div class="complaint-draft">

                    <div class="draft-header">

                        <span>
                            COMPLAINT DRAFT
                        </span>

                        <button
                            type="button"
                            class="secondary-button"
                            onclick="copyTextToClipboard(
                                document.getElementById('complaint-draft-text').innerText
                            )"
                        >
                            Copy
                        </button>

                    </div>


                    <div
                        id="complaint-draft-text"
                        class="draft-text"
                    >
                        ${escapeHTML(
                            draft
                        )}
                    </div>

                </div>

            `;

        }


        showToast(
            "Complaint draft generated."
        );


    } catch (error) {

        if (result) {

            result.innerHTML = `
                <div class="medical-warning">

                    <strong>
                        Unable to generate complaint
                    </strong>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>
            `;

        }

    }

}


/* =========================================================
   NEARBY SERVICES
========================================================= */

function setupNearby() {

    document
        .getElementById(
            "nearby-search-button"
        )
        ?.addEventListener(
            "click",
            searchNearby
        );


    document
        .getElementById(
            "nearby-location-button"
        )
        ?.addEventListener(
            "click",
            useNearbyLocation
        );

}


async function searchNearby() {

    const search =
        document
            .getElementById(
                "nearby-search"
            )
            ?.value
            .trim();


    const type =
        document
            .getElementById(
                "nearby-type"
            )
            ?.value;


    const results =
        document.getElementById(
            "nearby-results"
        );


    if (!results) {
        return;
    }


    results.innerHTML = `
        <div class="empty-state">

            <span>
                ⌛
            </span>

            <h3>
                Searching nearby services...
            </h3>

        </div>
    `;


    try {

        const params =
            new URLSearchParams();


        if (search) {

            params.set(
                "location",
                search
            );

        }


        if (type) {

            params.set(
                "type",
                type
            );

        }


        const response =
            await fetch(
                `/api/nearby?${params.toString()}`
            );


        const data =
            await response.json();


        if (
            !response.ok
            ||
            !data.success
        ) {

            throw new Error(
                data.error
                ||
                "Nearby search failed."
            );

        }


        const services =
            Array.isArray(
                data.services
            )
                ?
                data.services
                :
                [];


        if (!services.length) {

            results.innerHTML = `
                <div class="empty-state">

                    <span>
                        ⌖
                    </span>

                    <h3>
                        No services found
                    </h3>

                    <p>
                        Try another location or service type.
                    </p>

                </div>
            `;

            return;

        }


        results.innerHTML =
            services
                .map(
                    createNearbyCard
                )
                .join("");


    } catch (error) {

        results.innerHTML = `
            <div class="empty-state">

                <span>
                    ⚠
                </span>

                <h3>
                    Nearby search unavailable
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>
        `;

    }

}


function createNearbyCard(
    service
) {

    const name =
        service.name
        ||
        service.title
        ||
        "Healthcare Service";


    const address =
        service.address
        ||
        service.location
        ||
        "Location unavailable";


    const phone =
        service.phone
        ||
        service.contact
        ||
        "";


    return `
        <article class="information-card">

            <span>
                NEARBY SERVICE
            </span>

            <h3>
                ${escapeHTML(
                    name
                )}
            </h3>

            <p>
                📍
                ${escapeHTML(
                    address
                )}
            </p>

            ${
                phone
                ?
                `
                    <p>
                        ☎
                        ${escapeHTML(
                            phone
                        )}
                    </p>
                `
                :
                ""
            }

        </article>
    `;

}


function useNearbyLocation() {

    if (
        !navigator.geolocation
    ) {

        showToast(
            "Geolocation is not supported."
        );

        return;

    }


    showToast(
        "Detecting your location..."
    );


    navigator.geolocation.getCurrentPosition(

        (position) => {

            const latitude =
                position.coords.latitude;


            const longitude =
                position.coords.longitude;


            const search =
                document.getElementById(
                    "nearby-search"
                );


            if (search) {

                search.value =
                    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

            }


            searchNearby();

        },


        () => {

            showToast(
                "Unable to access your location."
            );

        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }

    );

}


/* =========================================================
   ACCOUNT
========================================================= */

function setupAccount() {

    updateAccountThemeButton();

}


function updateAccountThemeButton() {

    const button =
        document.getElementById(
            "account-theme-toggle"
        );


    if (!button) {
        return;
    }


    button.textContent =
        state.theme === "dark"
            ? "Switch to Light"
            : "Switch to Dark";

}


/* =========================================================
   GLOBAL HELPERS
========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },

            3000
        );

}


/* =========================================================
   COPY
========================================================= */

async function copyTextToClipboard(
    text
) {

    try {

        await navigator.clipboard.writeText(
            text
        );


        showToast(
            "Copied to clipboard."
        );

    } catch (error) {

        console.error(
            "Clipboard error:",
            error
        );


        showToast(
            "Could not copy text."
        );

    }

}


/* =========================================================
   CLEANUP CAMERA WHEN LEAVING OCR
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
            &&
            ocrCameraStream
        ) {

            stopOCRCamera();

        }

    }
);


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        const sidebar =
            document.getElementById(
                "sidebar"
            );


        if (!sidebar) {
            return;
        }


        if (
            window.innerWidth <= 900
        ) {

            sidebar.classList.remove(
                "collapsed"
            );

        } else {

            sidebar.classList.remove(
                "open"
            );


            if (
                state.sidebarCollapsed
            ) {

                sidebar.classList.add(
                    "collapsed"
                );

            }

        }

    }
);


/* =========================================================
   FINAL INITIAL VIEW
========================================================= */

setTimeout(
    () => {

        loadInitialView();

    },
    0
);


/* =========================================================
   SAFETY: STOP CAMERA BEFORE PAGE UNLOAD
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        if (
            ocrCameraStream
        ) {

            ocrCameraStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }

    }
);


/* =========================================================
   MEDIALERT READY
========================================================= */

console.log(
    "%cMediAlert frontend loaded successfully.",
    "font-weight:800;"
);