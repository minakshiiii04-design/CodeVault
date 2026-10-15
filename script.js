



console.log("CodeVault is running!");

// ========================================
// 1. SUPABASE CONNECTION
// ========================================

// Use your actual Supabase Project URL and Publishable Key.
const SUPABASE_URL = "https://ityysrqizeqwqdcqzgvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fMx2kdKCyG1sxCtoC0Edzg_YtsTN2qs";


if (!window.supabase) {
    alert("Supabase library did not load. Please check your internet connection.");
    throw new Error("Supabase library not found.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let savedCodes = [];
let editingCodeId = null;

// ========================================
// 2. HTML ELEMENTS
// ========================================

const authSection = document.getElementById("authSection");
const appContent = document.getElementById("appContent");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");
const authMessage = document.getElementById("authMessage");
const logoutBtn = document.getElementById("logoutBtn");

const totalSnippets = document.getElementById("totalSnippets");
const jsCount = document.getElementById("jsCount");
const cCount = document.getElementById("cCount");
const pythonCount = document.getElementById("pythonCount");

const searchInput = document.getElementById("searchInput");
const languageFilter = document.getElementById("languageFilter");
const addCodeBtn = document.getElementById("addCodeBtn");
const codeContainer = document.getElementById("codeContainer");

const codeForm = document.getElementById("codeForm");
const codeTitle = document.getElementById("codeTitle");
const codeLanguage = document.getElementById("codeLanguage");
const codeDescription = document.getElementById("codeDescription");
const codeInput = document.getElementById("codeInput");
const saveCodeBtn = document.getElementById("saveCodeBtn");
const cancelCodeBtn = document.getElementById("cancelCodeBtn");

const themeBtn = document.getElementById("themeBtn");

// ========================================
// 3. AUTHENTICATION UI
// ========================================

function showAuthMessage(message) {
    authMessage.textContent = message;
}

function updateAuthUI() {
    if (currentUser) {
        authSection.style.display = "none";
        appContent.style.display = "block";
        logoutBtn.style.display = "inline-block";
    } else {
        authSection.style.display = "block";
        appContent.style.display = "none";
        logoutBtn.style.display = "none";
        codeForm.style.display = "none";
    }
}

// FIX: Switch complete panels, not just the forms.

showSignupBtn.addEventListener("click", function () {
    loginPanel.style.display = "none";
    signupPanel.style.display = "block";
    showAuthMessage("");
});

showLoginBtn.addEventListener("click", function () {
    signupPanel.style.display = "none";
    loginPanel.style.display = "block";
    showAuthMessage("");
});

// ========================================
// 4. CREATE ACCOUNT
// ========================================

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = signupEmail.value.trim();
    const password = signupPassword.value;

    if (password.length < 8) {
        showAuthMessage("Password must contain at least 8 characters.");
        return;
    }

    signupBtn.disabled = true;
    showAuthMessage("Creating your account...");

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data.session && data.user) {
            currentUser = data.user;
            updateAuthUI();
            showAuthMessage("");
            await loadCodes();
        } else {
            showAuthMessage(
                "Account created! Check your email for verification, then log in."
            );
        }
    } catch (error) {
        console.error("Signup error:", error);
        showAuthMessage(error.message);
    } finally {
        signupBtn.disabled = false;
    }
});

// ========================================
// 5. LOGIN
// ========================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    loginBtn.disabled = true;
    showAuthMessage("Logging in...");

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: loginEmail.value.trim(),
                password: loginPassword.value
            });

        if (error) throw error;

        currentUser = data.user;
        updateAuthUI();
        showAuthMessage("");
        await loadCodes();
    } catch (error) {
        console.error("Login error:", error);
        showAuthMessage(error.message);
    } finally {
        loginBtn.disabled = false;
    }
});

// ========================================
// 6. LOGOUT
// ========================================

logoutBtn.addEventListener("click", async function () {
    logoutBtn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        currentUser = null;
        savedCodes = [];
        resetCodeForm();
        renderCodes();
        updateDashboard();
        updateAuthUI();
        showAuthMessage("You have logged out.");
    } catch (error) {
        console.error("Logout error:", error);
        alert("Could not log out: " + error.message);
    } finally {
        logoutBtn.disabled = false;
    }
});

// ========================================
// 7. LOAD THE LOGGED-IN USER'S CODES
// ========================================

async function loadCodes() {
    if (!currentUser) {
        savedCodes = [];
        renderCodes();
        updateDashboard();
        return;
    }

    const { data, error } = await supabaseClient
        .from("code_snippets")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load error:", error);
        alert("Could not load codes: " + error.message);
        return;
    }

    savedCodes = data || [];
    renderCodes();
    updateDashboard();
}

// ========================================
// 8. SAVE OR UPDATE CODE
// ========================================

// In your HTML, codeForm is a SECTION, not a FORM.
// Therefore, handle the Save Code button click directly.

saveCodeBtn.addEventListener("click", async function () {
    if (!currentUser) {
        alert("Please log in first.");
        return;
    }

    const title = codeTitle.value.trim();
    const language = codeLanguage.value;
    const description = codeDescription.value.trim();
    const code = codeInput.value;

    if (!title || !language || !code.trim()) {
        alert("Please enter a title, select a language, and add your code.");
        return;
    }

    const codeData = {
        title: title,
        language: language,
        description: description,
        code: code,
        user_id: currentUser.id
    };

    saveCodeBtn.disabled = true;

    try {
        let result;

        if (editingCodeId !== null) {
            result = await supabaseClient
                .from("code_snippets")
                .update(codeData)
                .eq("id", editingCodeId)
                .eq("user_id", currentUser.id);
        } else {
            result = await supabaseClient
                .from("code_snippets")
                .insert([codeData]);
        }

        if (result.error) throw result.error;

        alert(
            editingCodeId !== null
                ? "Code updated successfully!"
                : "Code saved successfully!"
        );

        resetCodeForm();
        await loadCodes();
    } catch (error) {
        console.error("Save error:", error);
        alert("Could not save code: " + error.message);
    } finally {
        saveCodeBtn.disabled = false;
    }
});

// ========================================
// 9. SHOW, RESET AND CANCEL CODE FORM
// ========================================

addCodeBtn.addEventListener("click", function () {
    resetCodeForm();
    codeForm.style.display = "block";
});

cancelCodeBtn.addEventListener("click", resetCodeForm);

function resetCodeForm() {
    codeTitle.value = "";
    codeLanguage.value = "";
    codeDescription.value = "";
    codeInput.value = "";

    editingCodeId = null;
    saveCodeBtn.textContent = "Save Code";
    codeForm.style.display = "none";
}

// ========================================
// 10. SAFELY DISPLAY SAVED CODE
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}

function renderCodes() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedLanguage = languageFilter.value;

    const filteredCodes = savedCodes.filter(function (item) {
        const title = String(item.title || "").toLowerCase();
        const description = String(item.description || "").toLowerCase();
        const code = String(item.code || "").toLowerCase();

        const matchesSearch =
            title.includes(searchText) ||
            description.includes(searchText) ||
            code.includes(searchText);

        const matchesLanguage =
            selectedLanguage === "all" ||
            item.language === selectedLanguage;

        return matchesSearch && matchesLanguage;
    });

    // Rebuild the code list and its empty state.
    codeContainer.innerHTML = "";

    if (filteredCodes.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "emptyMessage";

        const heading = document.createElement("h2");
        const paragraph = document.createElement("p");

        if (savedCodes.length === 0) {
            heading.textContent = "No code snippets yet";
            paragraph.textContent =
                "Start building your personal code library";
        } else {
            heading.textContent = "No matching code snippets";
            paragraph.textContent =
                "Try a different search or language filter.";
        }

        emptyDiv.appendChild(heading);
        emptyDiv.appendChild(paragraph);
        codeContainer.appendChild(emptyDiv);
        return;
    }

    filteredCodes.forEach(function (item) {
        const card = document.createElement("div");
        card.className = "code-card";

        card.innerHTML = `
            <h3>${escapeHTML(item.title)}</h3>
            <p><strong>Language:</strong> ${escapeHTML(item.language)}</p>
            <p>${escapeHTML(item.description || "")}</p>
            <pre><code>${escapeHTML(item.code)}</code></pre>
            <div class="code-actions">
                <button type="button" class="run-btn">Run</button>
                <button type="button" class="copy-btn">Copy</button>
                <button type="button" class="edit-btn">Edit</button>
                <button type="button" class="delete-btn">Delete</button>
            </div>
        `;

        // Run JavaScript snippets only.
        card.querySelector(".run-btn").addEventListener("click", function () {
            if (item.language !== "javascript") {
                alert("Run is available only for JavaScript snippets.");
                return;
            }

            try {
                const output = new Function(item.code)();
                alert("Code executed. Return value: " + String(output));
            } catch (error) {
                alert("Code error: " + error.message);
            }
        });

        // Copy code.
        card.querySelector(".copy-btn").addEventListener("click", async function () {
            try {
                await navigator.clipboard.writeText(item.code);
                alert("Code copied!");
            } catch (error) {
                alert("Could not copy. Please copy the code manually.");
            }
        });

        // Edit code.
        card.querySelector(".edit-btn").addEventListener("click", function () {
            editingCodeId = item.id;

            codeTitle.value = item.title || "";
            codeLanguage.value = item.language || "";
            codeDescription.value = item.description || "";
            codeInput.value = item.code || "";

            saveCodeBtn.textContent = "Update Code";
            codeForm.style.display = "block";
            codeForm.scrollIntoView({ behavior: "smooth" });
        });

        // Delete code.
        card.querySelector(".delete-btn").addEventListener("click", async function () {
            if (!currentUser) {
                alert("Please log in first.");
                return;
            }

            const confirmed = confirm(
                "Are you sure you want to delete this code?"
            );

            if (!confirmed) return;

            const { error } = await supabaseClient
                .from("code_snippets")
                .delete()
                .eq("id", item.id)
                .eq("user_id", currentUser.id);

            if (error) {
                console.error("Delete error:", error);
                alert("Could not delete code: " + error.message);
                return;
            }

            await loadCodes();
        });

        codeContainer.appendChild(card);
    });
}

// ========================================
// 11. DASHBOARD COUNTS
// ========================================

function updateDashboard() {
    totalSnippets.textContent = savedCodes.length;

    jsCount.textContent = savedCodes.filter(
        item => item.language === "javascript"
    ).length;

    cCount.textContent = savedCodes.filter(
        item => item.language === "c"
    ).length;

    pythonCount.textContent = savedCodes.filter(
        item => item.language === "python"
    ).length;
}

// ========================================
// 12. SEARCH AND LANGUAGE FILTER
// ========================================

searchInput.addEventListener("input", renderCodes);
languageFilter.addEventListener("change", renderCodes);

// ========================================
// 13. DARK MODE
// ========================================

themeBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");

    themeBtn.textContent = isDark
        ? "☀️ Light Mode"
        : "🌙 Dark Mode";

    localStorage.setItem(
        "codeVaultTheme",
        isDark ? "dark" : "light"
    );
});

if (localStorage.getItem("codeVaultTheme") === "dark") {
    document.body.classList.add("dark-mode");
    themeBtn.textContent = "☀️ Light Mode";
}

// ========================================
// 14. RESTORE LOGIN SESSION
// ========================================

async function initializeApp() {
    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        currentUser = data.session?.user || null;
        updateAuthUI();

        if (currentUser) {
            await loadCodes();
        } else {
            savedCodes = [];
            renderCodes();
            updateDashboard();
        }
    } catch (error) {
        console.error("Session error:", error);
        showAuthMessage(
            "Could not connect to Supabase. Check your URL and publishable key."
        );
    }
}

// Keep the UI updated when the authentication session changes.
supabaseClient.auth.onAuthStateChange(function (_event, session) {
    currentUser = session?.user || null;
    updateAuthUI();

    // Wait until the authentication callback has completed.
    setTimeout(function () {
        if (currentUser) {
            loadCodes();
        } else {
            savedCodes = [];
            renderCodes();
            updateDashboard();
        }
    }, 0);
});

initializeApp();
