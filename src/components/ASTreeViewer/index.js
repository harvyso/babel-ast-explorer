import React, {
  useState,
  useReducer,
  useContext,
  useEffect,
  useRef
} from 'react';
import styles from './style.scss';
import { Checkbox } from 'antd';
import cx from 'classnames';

const initialAstState = {
  hideEmpty: false,
  hideLocation: false,
  hideType: false
};
const ASTContext = React.createContext(initialAstState);
const astStateReducer = (state, action) => {
  return {
    ...state,
    [action]: !state[action]
  };
};

const MarkerContext = React.createContext(() => {});
const SelectedNodeContext = React.createContext([0, 0]);

export default function ASTreeViewer({ data, setMarker, selectedNode }) {
  const [state, toggle] = useReducer(astStateReducer, initialAstState);
  return (
    <ASTContext.Provider value={state}>
      <MarkerContext.Provider value={setMarker}>
        <SelectedNodeContext.Provider value={selectedNode}>
          <div className={styles.options}>
            <Checkbox onChange={() => toggle('hideEmpty')}>
              Hide empty keys
            </Checkbox>
            <Checkbox onChange={() => toggle('hideLocation')}>
              Hide location data
            </Checkbox>
            <Checkbox onChange={() => toggle('hideType')}>
              Hide type keys
            </Checkbox>
          </div>
          <div style={{ margin: 4 }}>
            <JSONObject data={data} root={true} />
          </div>
        </SelectedNodeContext.Provider>
      </MarkerContext.Provider>
    </ASTContext.Provider>
  );
}

function getExpandable(data) {
  return (
    !!data &&
    typeof data === 'object' &&
    (Array.isArray(data) ? data.length > 0 : true)
  );
}

function getComponent(data) {
  switch (typeof data) {
    case 'object':
      if (Array.isArray(data)) {
        return JSONArray;
      } else if (data === null) {
        return JSONNull;
      } else {
        return JSONObject;
      }
    case 'number':
      return JSONNumber;
    case 'string':
      return JSONString;
    case 'boolean':
      return JSONBoolean;
    default:
      return JSONUnknown;
  }
}

function JSONNumber({ data }) {
  return <span className={styles.number}>{data}</span>;
}

function JSONString({ data }) {
  return <span className={styles.string}>{'"' + data + '"'}</span>;
}

function JSONObject({ data, expand, root, onToggleExpand }) {
  const [rootExpand, setRootExpand] = useState(true);
  const toggleRootExpand = () => setRootExpand(_ => !_);

  const shouldExpand = root ? rootExpand : expand;
  const toggleExpand = root ? toggleRootExpand : onToggleExpand;

  const keys = Object.keys(data);

  const astState = useContext(ASTContext);

  return (
    <>
      {root && (
        <ExpandToggle expand={shouldExpand} toggleExpand={toggleRootExpand} />
      )}
      {data.type && (
        <span className={styles.nodeType} onClick={toggleExpand}>
          {data.type}
        </span>
      )}
      <span className={cx(styles.openingBracket, styles.bracket)}>{'{'}</span>

      {!shouldExpand && <PreviewObject data={keys} onClick={toggleExpand} />}

      <div className={cx(styles.child, !shouldExpand && styles.hidden)}>
        {keys.map(key =>
          (astState.hideLocation && ['loc', 'start', 'end'].includes(key)) ||
          (astState.hideEmpty && data[key] === null) ||
          (astState.hideType && key === 'type') ? null : (
            <JSONItem key={key} name={key} value={data[key]} />
          )
        )}
      </div>

      <span className={styles.bracket}>{'}'}</span>
    </>
  );
}

function JSONItem({ name, value }) {
  const [expand, setExpand] = useState(true);
  const toggleExpand = () => setExpand(_ => !_);

  const Component = getComponent(value);
  const isExpandable = getExpandable(value);

  const selectedNode = useContext(SelectedNodeContext);
  const isSelected = selectedNode === value;

  const setMarker = useContext(MarkerContext);

  return (
    <Highlightable
      highlighted={isSelected}
      onMouseOver={event => {
        if (value.loc) {
          event.stopPropagation();
          setMarker(value.loc);
        }
      }}
      onMouseLeave={() => {
        setMarker(null);
      }}
    >
      {!!isExpandable && (
        <ExpandToggle expand={expand} toggleExpand={toggleExpand} />
      )}
      <span
        className={cx(styles.key, isExpandable ? styles.expandableKey : null)}
        onClick={toggleExpand}
      >
        {name}
      </span>
      <span className={styles.colon}>{':'}</span>
      <span className={styles.value}>
        {isExpandable ? (
          <Component
            data={value}
            expand={expand}
            onToggleExpand={toggleExpand}
          />
        ) : (
          <Component data={value} />
        )}
      </span>
    </Highlightable>
  );
}

function PreviewObject({ data, onClick }) {
  return (
    <span className={styles.preview} onClick={onClick}>
      {data.slice(0, 3).join(', ') +
        (data.length > 3 ? `... +${data.length - 3}` : '')}
    </span>
  );
}

function JSONArray({ data, expand, onToggleExpand }) {
  const selectedNode = useContext(SelectedNodeContext);
  const setMarker = useContext(MarkerContext);

  return (
    <>
      <span className={cx(styles.openingBracket, styles.bracket)}>{'['}</span>

      {data.length > 0 && (
        <>
          {!expand && <PreviewArray data={data} onClick={onToggleExpand} />}
          <div className={cx(styles.child, !expand && styles.hidden)}>
            {data.map((datum, idx) => {
              const Component = getComponent(datum);
              const isSelected = selectedNode === datum;

              return (
                <Highlightable
                  key={idx}
                  highlighted={isSelected}
                  onMouseOver={event => {
                    event.stopPropagation();
                    setMarker(datum.loc);
                  }}
                  onMouseLeave={() => {
                    setMarker(null);
                  }}
                >
                  <Component data={datum} root={true} />
                </Highlightable>
              );
            })}
          </div>
        </>
      )}
      <span className={styles.bracket}>{']'}</span>
    </>
  );
}

function PreviewArray({ data, onClick }) {
  return (
    <span className={styles.preview} onClick={onClick}>
      {`${data.length} element${data.length > 1 ? 's' : ''}`}
    </span>
  );
}

function JSONNull() {
  return <span className={styles.null}>null</span>;
}

function JSONBoolean({ data }) {
  return <span className={styles.boolean}>{JSON.stringify(data)}</span>;
}

function JSONUnknown() {
  return null;
}

function ExpandToggle({ expand, toggleExpand }) {
  return (
    <span className={styles.expandToggle} onClick={toggleExpand}>
      {expand ? '-' : '+'}
    </span>
  );
}

function Highlightable({ highlighted, onMouseOver, onMouseLeave, children }) {
  const ref = useHighlight(highlighted);
  return (
    <div
      ref={ref}
      className={cx(highlighted && styles.highlighted)}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function useHighlight(highlighted) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref && highlighted) {
      ref.current.scrollIntoView(true);
    }
  }, [highlighted]);
  return ref;
}