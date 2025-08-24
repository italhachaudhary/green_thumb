document.addEventListener("DOMContentLoaded", () => {
  // --- SHARED ELEMENTS (in base.html) ---
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
  const themeToggleLightIcon = document.getElementById(
    "theme-toggle-light-icon"
  );
  const logoutBtn = document.getElementById("logout-btn");
  const logoutConfirmationModal = document.getElementById(
    "logout-confirmation-modal"
  );
  const cancelLogoutBtn = document.getElementById("cancel-logout-btn");
  const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeMenuBtn = document.getElementById("close-menu-btn");
  const mobileThemeBtn = document.getElementById("mobile-theme-btn");
  const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

  // --- AI ADVISOR PAGE ELEMENTS (in index.html) ---
  const form = document.getElementById("crop-form");
  const input = document.getElementById("crop-input");
  const chatContainer = document.getElementById("chat-container");
  const loadingIndicator = document.getElementById("loading-indicator");
  const historyList = document.getElementById("history-list");
  const historyLoading = document.getElementById("history-loading");
  const historySidebar = document.getElementById("history-sidebar");
  const toggleHistoryBtn = document.getElementById("toggle-history-btn");
  const historyArrow = document.getElementById("history-arrow");
  const historyContent = document.getElementById("history-content");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const historyHeaderExpanded = document.getElementById(
    "history-header-expanded"
  );
  const historyHeaderCollapsed = document.getElementById(
    "history-header-collapsed"
  );
  const confirmationModal = document.getElementById("confirmation-modal");
  const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
  const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

  // Individual item delete modal elements
  const itemConfirmationModal = document.getElementById(
    "item-confirmation-modal"
  );
  const itemDeleteMessage = document.getElementById("item-delete-message");
  const cancelItemDeleteBtn = document.getElementById("cancel-item-delete-btn");
  const confirmItemDeleteBtn = document.getElementById(
    "confirm-item-delete-btn"
  );

  const newChatBtn = document.getElementById("new-chat-btn");
  const mobileNewChatBtn = document.getElementById("mobile-new-chat-btn");
  const mobileHistoryBtn = document.getElementById("mobile-history-btn");

  // --- STATE & CONSTANTS ---
  let currentCropName = "";
  const API_PROFILE_URL = "/api/crop-profile";
  const API_HISTORY_URL = "/api/history";
  const INITIAL_BOT_MESSAGE = `<div class="flex justify-start mb-4"><div class="bg-green-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-4 max-w-lg"><p class="font-semibold">Green Thumb AI</p><p>Hello! What crop would you like to grow today?</p></div></div>`;

  // --- INITIALIZATION ---
  updateThemeIcons();

  // --- SHARED EVENT LISTENERS ---
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (logoutConfirmationModal)
        logoutConfirmationModal.classList.remove("hidden");
    });
  }
  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener("click", () =>
      logoutConfirmationModal.classList.add("hidden")
    );
  }
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener(
      "click",
      () => (window.location.href = "/logout")
    );
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", () =>
      mobileMenu.classList.remove("hidden")
    );
  }
  if (closeMenuBtn) {
    closeMenuBtn.addEventListener("click", () =>
      mobileMenu.classList.add("hidden")
    );
  }
  if (mobileThemeBtn) {
    mobileThemeBtn.addEventListener("click", toggleTheme);
  }
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener("click", () => {
      if (mobileMenu) mobileMenu.classList.add("hidden");
      if (logoutConfirmationModal)
        logoutConfirmationModal.classList.remove("hidden");
    });
  }

  // --- AI ADVISOR PAGE SPECIFIC LOGIC ---
  if (document.getElementById("chat-container")) {
    fetchHistory();
    startNewChat();

    if (form) form.addEventListener("submit", handleFormSubmit);
    if (newChatBtn) newChatBtn.addEventListener("click", startNewChat);
    if (toggleHistoryBtn)
      toggleHistoryBtn.addEventListener("click", handleToggleHistory);
    if (clearHistoryBtn)
      clearHistoryBtn.addEventListener("click", () =>
        confirmationModal.classList.remove("hidden")
      );
    if (cancelDeleteBtn)
      cancelDeleteBtn.addEventListener("click", () =>
        confirmationModal.classList.add("hidden")
      );
    if (confirmDeleteBtn)
      confirmDeleteBtn.addEventListener("click", handleConfirmDelete);

    // Individual item delete modal event listeners
    if (cancelItemDeleteBtn)
      cancelItemDeleteBtn.addEventListener("click", () =>
        itemConfirmationModal.classList.add("hidden")
      );
    if (confirmItemDeleteBtn)
      confirmItemDeleteBtn.addEventListener("click", () => {
        const { historyId, cropName } = window.currentDeleteOperation;
        itemConfirmationModal.classList.add("hidden");
        performItemDelete(historyId, cropName);
      });

    if (mobileNewChatBtn) {
      mobileNewChatBtn.addEventListener("click", () => {
        startNewChat();
        mobileMenu.classList.add("hidden");
      });
    }
    if (mobileHistoryBtn) {
      mobileHistoryBtn.addEventListener("click", () => {
        historySidebar.classList.remove("hidden");
        historySidebar.classList.add("md:flex");
        mobileMenu.classList.add("hidden");
      });
    }
  }

  // --- FUNCTIONS ---

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    const isDarkMode = document.documentElement.classList.contains("dark");
    localStorage.setItem("color-theme", isDarkMode ? "dark" : "light");
    updateThemeIcons();
  }

  function updateThemeIcons() {
    if (document.documentElement.classList.contains("dark")) {
      if (themeToggleLightIcon) themeToggleLightIcon.classList.remove("hidden");
      if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add("hidden");
    } else {
      if (themeToggleDarkIcon) themeToggleDarkIcon.classList.remove("hidden");
      if (themeToggleLightIcon) themeToggleLightIcon.classList.add("hidden");
    }
  }

  function startNewChat() {
    if (chatContainer) chatContainer.innerHTML = INITIAL_BOT_MESSAGE;
    if (input) input.value = "";
  }

  function handleToggleHistory() {
    historySidebar.classList.toggle("w-72");
    historySidebar.classList.toggle("w-20");
    historyArrow.classList.toggle("rotate-180");
    historyHeaderExpanded.classList.toggle("hidden");
    historyContent.classList.toggle("hidden");
    historyHeaderCollapsed.classList.toggle("hidden");
    historyHeaderCollapsed.classList.toggle("flex");
  }

  async function handleConfirmDelete() {
    try {
      const response = await fetch(`${API_HISTORY_URL}/delete`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to delete history");
      fetchHistory();
    } catch (error) {
      console.error("Error deleting history:", error);
    } finally {
      if (confirmationModal) confirmationModal.classList.add("hidden");
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const cropName = input.value.trim();
    if (!cropName) return;
    currentCropName = cropName;
    displayUserMessage(cropName);
    input.value = "";
    loadingIndicator.classList.remove("hidden");
    chatContainer.scrollTop = chatContainer.scrollHeight;
    try {
      const response = await generateCropProfile(cropName);

      // Handle different response types
      if (response.type === "greeting") {
        displayGreetingMessage(response.message);
      } else if (response.type === "validation_error") {
        displayValidationMessage(response.message);
      } else {
        // Handle regular crop profile response
        const cropProfile =
          typeof response === "string" ? JSON.parse(response) : response;
        displayBotMessage(cropProfile);
        fetchHistory();
      }
    } catch (error) {
      console.error("Error fetching crop profile:", error);
      displayBotMessage({
        error: "Sorry, I had trouble fetching that information.",
      });
    } finally {
      loadingIndicator.classList.add("hidden");
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function fetchHistory() {
    try {
      const response = await fetch(API_HISTORY_URL);
      if (!response.ok) throw new Error("Failed to fetch history");
      const historyData = await response.json();
      if (historyLoading) historyLoading.classList.add("hidden");
      if (historyList) historyList.innerHTML = "";
      if (historyData.length === 0) {
        if (historyList)
          historyList.innerHTML =
            '<li class="text-gray-500 dark:text-gray-400 text-sm">No recent searches.</li>';
        if (clearHistoryBtn) {
          clearHistoryBtn.disabled = true;
          clearHistoryBtn.classList.add("cursor-not-allowed", "opacity-50");
        }
      } else {
        if (clearHistoryBtn) {
          clearHistoryBtn.disabled = false;
          clearHistoryBtn.classList.remove("cursor-not-allowed", "opacity-50");
        }
        historyData.forEach((item) => {
          const li = document.createElement("li");
          li.className =
            "bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm text-gray-800 dark:text-gray-200 hover:bg-green-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-between group";

          // Create the clickable content area
          const contentDiv = document.createElement("div");
          contentDiv.className = "flex-1 cursor-pointer truncate pr-2";
          contentDiv.textContent = item.crop_name;
          contentDiv.title = item.crop_name;
          contentDiv.onclick = () => loadHistoryItem(item.id);

          // Create delete button
          const deleteBtn = document.createElement("button");
          deleteBtn.className =
            "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20";
          deleteBtn.innerHTML = "🗑️";
          deleteBtn.title = "Delete this search";
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteHistoryItem(item.id, item.crop_name);
          };

          li.appendChild(contentDiv);
          li.appendChild(deleteBtn);
          li.dataset.id = item.id;

          if (historyList) historyList.appendChild(li);
        });
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      if (historyLoading)
        historyLoading.textContent = "Could not load history.";
    }
  }

  async function loadHistoryItem(historyId) {
    if (window.innerWidth < 768) {
      if (historySidebar) historySidebar.classList.add("hidden");
    }
    if (loadingIndicator) loadingIndicator.classList.remove("hidden");
    try {
      const response = await fetch(`${API_HISTORY_URL}/${historyId}`);
      if (!response.ok) throw new Error("Failed to load history item");
      const data = await response.json();
      currentCropName = data.crop_name;
      const content = JSON.parse(data.content);
      startNewChat();
      displayUserMessage(`Loading from history: ${currentCropName}`);
      displayBotMessage(content);
    } catch (error) {
      console.error("Error loading history item:", error);
      displayBotMessage({
        error: "Sorry, I could not load that item from your history.",
      });
    } finally {
      if (loadingIndicator) loadingIndicator.classList.add("hidden");
    }
  }

  async function deleteHistoryItem(historyId, cropName) {
    // Store the current delete operation data
    window.currentDeleteOperation = { historyId, cropName };

    // Update modal message
    if (itemDeleteMessage) {
      itemDeleteMessage.textContent = `Are you sure you want to delete the search for "${cropName}"? This action cannot be undone.`;
    }

    // Show the modal
    if (itemConfirmationModal) {
      itemConfirmationModal.classList.remove("hidden");
    }
  }

  async function performItemDelete(historyId, cropName) {
    try {
      const response = await fetch(`${API_HISTORY_URL}/${historyId}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to delete history item");
      }

      const result = await response.json();
      if (result.success) {
        // Remove the item from the UI
        const historyItem = document.querySelector(`[data-id="${historyId}"]`);
        if (historyItem) {
          historyItem.remove();
        }

        // Check if history list is now empty
        const remainingItems = document.querySelectorAll(
          "#history-list li:not(.text-gray-500)"
        );
        if (remainingItems.length === 0) {
          if (historyList) {
            historyList.innerHTML =
              '<li class="text-gray-500 dark:text-gray-400 text-sm">No recent searches.</li>';
          }
          if (clearHistoryBtn) {
            clearHistoryBtn.disabled = true;
            clearHistoryBtn.classList.add("cursor-not-allowed", "opacity-50");
          }
        }

        console.log(`Successfully deleted history item: ${cropName}`);
      } else {
        throw new Error(result.message || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error deleting history item:", error);
      alert(`Failed to delete the search for "${cropName}". Please try again.`);
    }
  }

  async function generateCropProfile(cropName) {
    const response = await fetch(API_PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop_name: cropName }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API request failed`);
    }
    return await response.json();
  }

  function displayUserMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("flex", "justify-end", "mb-4");
    messageElement.innerHTML = `<div class="bg-blue-500 text-white rounded-lg p-4 max-w-lg"><p class="font-semibold">You</p><p>${message}</p></div>`;
    if (chatContainer) {
      chatContainer.appendChild(messageElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function displayBotMessage(data) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("flex", "justify-start", "mb-4");
    let contentHtml = "";
    if (data.error) {
      contentHtml = `<p class="text-red-500">${data.error}</p>`;
    } else {
      contentHtml = `
                <div class="w-full">
                    <h3 class="text-2xl font-bold mb-4 text-green-800 dark:text-green-400">Profile: ${currentCropName}</h3>
                    <div class="space-y-3">
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">🌱</span> Ideal Season & Timing</h4><p class="mt-1 pl-10 text-gray-700 dark:text-gray-300">${
                          data.idealSeason || "N/A"
                        }</p></div>
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">🌡️</span> Temperature</h4><ul class="mt-1 pl-10 list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1"><li><strong>Germination:</strong> ${
                          data.temperature?.germination || "N/A"
                        }</li><li><strong>Vegetative:</strong> ${
        data.temperature?.vegetative || "N/A"
      }</li><li><strong>Fruiting:</strong> ${
        data.temperature?.fruiting || "N/A"
      }</li></ul></div>
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">💧</span> Humidity</h4><p class="mt-1 pl-10 text-gray-700 dark:text-gray-300">${
                          data.humidity || "N/A"
                        }</p></div>
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">💡</span> Light Requirements</h4><ul class="mt-1 pl-10 list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1"><li><strong>Duration:</strong> ${
                          data.light?.duration || "N/A"
                        }</li><li><strong>DLI:</strong> ${
        data.light?.dli || "N/A"
      }</li></ul></div>
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">🌿</span> Soil & pH</h4><ul class="mt-1 pl-10 list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1"><li><strong>Composition:</strong> ${
                          data.soil?.composition || "N/A"
                        }</li><li><strong>pH:</strong> ${
        data.soil?.ph || "N/A"
      }</li></ul></div>
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">📏</span> Plant Spacing</h4><p class="mt-1 pl-10 text-gray-700 dark:text-gray-300">${
                          data.spacing || "N/A"
                        }</p></div>
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">📅</span> Growth Timeline</h4><p class="mt-1 pl-10 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${
                          data.timeline || "N/A"
                        }</p></div>
                        <div class="p-4 bg-green-50 dark:bg-gray-700 rounded-lg border border-green-200/50 dark:border-gray-600"><h4 class="font-semibold text-green-700 dark:text-green-400 flex items-center text-lg"><span class="text-2xl mr-3">🐛</span> Common Pests & Diseases</h4><p class="mt-1 pl-10 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${
                          data.pestsAndDiseases || "N/A"
                        }</p></div>
                    </div>
                </div>`;
    }
    messageElement.innerHTML = `<div class="bg-gray-100/50 dark:bg-gray-900/50 rounded-lg p-4 w-full"><p class="font-semibold mb-2 text-gray-800 dark:text-gray-200">Green Thumb AI</p>${contentHtml}</div>`;
    if (chatContainer) {
      chatContainer.appendChild(messageElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function displayGreetingMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("flex", "justify-start", "mb-4");
    const contentHtml = `<p class="text-gray-700 dark:text-gray-300">${message}</p>`;
    messageElement.innerHTML = `<div class="bg-green-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-4 max-w-lg"><p class="font-semibold mb-2">Green Thumb AI</p>${contentHtml}</div>`;
    if (chatContainer) {
      chatContainer.appendChild(messageElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function displayValidationMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("flex", "justify-start", "mb-4");
    const contentHtml = `<p class="text-orange-600 dark:text-orange-400">${message}</p>`;
    messageElement.innerHTML = `<div class="bg-orange-50 dark:bg-gray-700 border border-orange-200 dark:border-orange-800 rounded-lg p-4 max-w-lg"><p class="font-semibold mb-2 text-orange-800 dark:text-orange-400">Green Thumb AI</p>${contentHtml}</div>`;
    if (chatContainer) {
      chatContainer.appendChild(messageElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
});
