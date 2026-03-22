/**
 * Tabs.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * WHERE THIS LIVES ON THE PAGE
 *
 * The EJS page (groupPage.ejs) renders this structure:
 *
 *   <%- include('partials/navbar',  { user }) %>
 *   <%- include('partials/header',  { title, subtitle }) %>
 *   <%- include('partials/sidebar', { activeMenu }) %>
 *
 *     <!-- MOUNT POINT — React fills this div -->
 *     <div id="group-tabs-root"
 *          data-group-id="<%= group.id %>"
 *          data-user-id="<%= user.id %>"
 *          data-group-name="<%= group.name %>">
 *     </div>
 *
 *   <%- include('partials/footer') %>
 *   <script type="module" src="/js/groupTabs.js"></script>
 *
 * This component renders INSIDE #group-tabs-root.
 * It is mounted by groupTabs.jsx (the entry point / mount file).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Props:
 *   tabs        {Array}    — [{ id, label, content, icon?, badge? }]
 *   defaultTab  {string}   — id of the tab to show on first load
 *   onTabChange {function} — optional callback(tabId) when user switches tabs
 */

import React, { useState } from 'react';
import '../styles/tabs.css';

const Tabs = ({ tabs = [], defaultTab = null, onTabChange = null }) => {
  const [activeTab, setActiveTab] = useState(
    defaultTab || (tabs.length > 0 ? tabs[0].id : null)
  );

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  const handleKeyDown = (e, tabId) => {
    const tabIds = tabs.map((t) => t.id);
    const currentIndex = tabIds.indexOf(activeTab);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleTabClick(tabId);
        return;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      const newTabId = tabIds[newIndex];
      handleTabClick(newTabId);
      setTimeout(() => {
        const btn = document.querySelector(`[data-tab-id="${newTabId}"]`);
        if (btn) btn.focus();
      }, 0);
    }
  };

  if (!tabs || tabs.length === 0) {
    return (
      <div className="tabs-container">
        <p className="tabs-empty">No tabs available</p>
      </div>
    );
  }

  return (
    <div className="tabs-container">

      {/* ── Tab Buttons ────────────────────────────────────────────────────── */}
      <div className="tab-buttons" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            className={`tablink ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            {tab.icon  && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Tab Content Panels ─────────────────────────────────────────────── */}
      <div className="tab-content-wrapper">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`${tab.id}-panel`}
            className={`tabcontent ${activeTab === tab.id ? 'active' : ''}`}
            role="tabpanel"
            aria-labelledby={tab.id}
            aria-hidden={activeTab !== tab.id}
          >
            {tab.content}
          </div>
        ))}
      </div>

    </div>
  );
};

export default Tabs;
