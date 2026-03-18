import React, { useState } from 'react';
import '../styles/tabs.css';

/**
 * Tabs Component
 * @component
 * @example
 * const tabs = [
 *   { id: 'chat', label: 'Chat', content: <ChatContent /> },
 *   { id: 'recommended', label: 'Recommended', content: <RecommendedContent /> },
 *   { id: 'itinerary', label: 'Itinerary', content: <ItineraryContent /> }
 * ];
 * 
 * <Tabs tabs={tabs} defaultTab="chat" />
 */
const Tabs = ({ tabs = [], defaultTab = null, onTabChange = null }) => {
  // Set the active tab - use defaultTab if provided, otherwise use first tab
  const [activeTab, setActiveTab] = useState(defaultTab || (tabs.length > 0 ? tabs[0].id : null));

  /**
   * Handle tab click
   * Updates active tab and calls onTabChange callback if provided
   */
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  /**
   * Handle keyboard navigation
   * Arrow keys to move between tabs, Enter/Space to activate
   */
  const handleKeyDown = (e, tabId) => {
    const tabIds = tabs.map(tab => tab.id);
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
      // Focus the new tab button
      setTimeout(() => {
        const tabButton = document.querySelector(`[data-tab-id="${newTabId}"]`);
        if (tabButton) {
          tabButton.focus();
        }
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
      {/* Tab Buttons */}
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
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
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
