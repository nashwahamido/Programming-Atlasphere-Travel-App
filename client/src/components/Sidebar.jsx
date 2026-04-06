import React, { useState, useEffect } from 'react';
import '../styles/sidebar.css';

var Sidebar = function(props) {
  var activeGroup = props.activeGroup;
  var onSelect = props.onSelect;
  var searchState = useState('');
  var search = searchState[0];
  var setSearch = searchState[1];
  var groupsState = useState([]);
  var groups = groupsState[0];
  var setGroups = groupsState[1];

  useEffect(function() {
    fetch('/groups/api/my-groups')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setGroups(data);
        // If no active group is set yet and we have groups, select the first
        if (data.length > 0 && (!activeGroup || !activeGroup.id)) {
          if (onSelect) onSelect(data[0]);
        }
      })
      .catch(function(err) { console.error('Failed to load groups:', err); });
  }, []);

  var filtered = groups.filter(function(g) {
    return g.name.toLowerCase().indexOf(search.toLowerCase()) !== -1;
  });

  return React.createElement('div', { className: 'sb' },
    React.createElement('div', { className: 'sb__header' },
      React.createElement('div', { className: 'sb__header-left' },
        React.createElement('span', { className: 'sb__title' }, 'Groups'),
        React.createElement('span', { className: 'sb__count' }, groups.length)
      ),
      React.createElement('a', { href: '/groups/create/country', className: 'sb__add' }, '+')
    ),
    React.createElement('div', { className: 'sb__search-wrap' },
      React.createElement('input', {
        className: 'sb__search',
        type: 'text',
        placeholder: 'search groups',
        value: search,
        onChange: function(e) { setSearch(e.target.value); }
      })
    ),
    React.createElement('div', { className: 'sb__list' },
      filtered.length === 0 && React.createElement('div', {
        style: { textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary, #888)', fontSize: '14px' }
      },
        React.createElement('p', { style: { marginBottom: '12px' } }, 'No groups yet'),
        React.createElement('a', {
          href: '/groups/create/country',
          style: { color: '#E8933A', fontWeight: 600, textDecoration: 'none' }
        }, 'Create your first trip')
      ),
      filtered.map(function(g) {
        var isActive = activeGroup && activeGroup.id === g.id;
        return React.createElement('a', {
          key: g.id,
          href: '/groups/' + g.id,
          className: 'sb__item' + (isActive ? ' sb__item--active' : ''),
          onClick: function(e) { e.preventDefault(); if (onSelect) onSelect(g); }
        },
          React.createElement('div', { className: 'sb__item-icon', style: { backgroundColor: g.color || '#3B5F8A' } },
            g.flag ? React.createElement('span', { style: { fontSize: '22px', lineHeight: '44px' } }, g.flag) : null
          ),
          React.createElement('div', { className: 'sb__item-info' },
            React.createElement('div', { className: 'sb__item-name' }, g.name)
          )
        );
      })
    )
  );
};

export default Sidebar;