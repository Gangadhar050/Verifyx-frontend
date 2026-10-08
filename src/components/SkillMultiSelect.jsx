import { useEffect, useMemo, useRef, useState } from 'react';
import './SkillMultiSelect.css';

export default function SkillMultiSelect({
  label,
  options = [],
  value = [],
  recommended = [],
  onChange,
  placeholder = 'Select skills',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const selected = Array.isArray(value) ? value : [];
  const recommendedSet = useMemo(() => new Set(recommended), [recommended]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? options.filter((item) => item.toLowerCase().includes(q)) : options;
    return [...list].sort(
      (a, b) =>
        Number(recommendedSet.has(b)) - Number(recommendedSet.has(a)) ||
        a.localeCompare(b),
    );
  }, [options, search, recommendedSet]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggle = (item) => {
    onChange(
      selected.includes(item)
        ? selected.filter((v) => v !== item)
        : [...selected, item],
    );
  };

  const selectFromDropdown = (item) => {
    toggle(item);
    setOpen(false);
    setSearch('');
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearch('');
  };

  const addRecommended = () =>
    onChange([...new Set([...selected, ...recommended])]);

  return (
    <div className="skill-select-block" ref={rootRef}>
      <div className="skill-select-label-row">
        <label>{label}</label>
        <span>{selected.length} selected</span>
      </div>

      {recommended.length > 0 && (
        <div className="recommended-strip">
          <span>Recommended for this role</span>
          <div>
            {recommended.slice(0, 8).map((item) => (
              <button
                type="button"
                key={item}
                className={selected.includes(item) ? 'active' : ''}
                onClick={() => toggle(item)}
              >
                {selected.includes(item) ? '✓ ' : '+ '}
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="add-all-recommended"
            onClick={addRecommended}
          >
            Add recommended
          </button>
        </div>
      )}

      <div className="skill-dropdown-shell">
        <button
          type="button"
          className={`skill-dropdown-trigger ${open ? 'open' : ''}`}
          onClick={() => {
            setOpen((current) => !current);
            if (open) setSearch('');
          }}
          aria-expanded={open}
        >
          <span>
            {selected.length
              ? `${selected.length} ${label.toLowerCase()} selected`
              : placeholder}
          </span>
          <b className={open ? 'dropdown-arrow open' : 'dropdown-arrow'}>⌄</b>
        </button>

        {open && (
          <div className="skill-dropdown-panel">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              autoFocus
            />

            <div className="skill-option-list">
              {filtered.map((item) => (
                <label
                  key={item}
                  className={recommendedSet.has(item) ? 'recommended-option' : ''}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(item)}
                    onChange={() => selectFromDropdown(item)}
                  />
                  <span>{item}</span>
                  {recommendedSet.has(item) && <em>Recommended</em>}
                </label>
              ))}
            </div>

            <div className="skill-dropdown-footer">
              <span>{filtered.length} options</span>
              <button type="button" onClick={closeDropdown}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="selected-skill-chips">
          {selected.map((item) => (
            <button type="button" key={item} onClick={() => toggle(item)}>
              {item} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
