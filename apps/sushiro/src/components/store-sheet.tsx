import { copy, type Language, queueBand, queueBandLabel } from "@/lib/queue-presentation";
import { isTicketing, type QueueStore } from "@/lib/queues";

type StoreSheetProps = {
  language: Language;
  onClose: () => void;
  store: QueueStore;
};

export function StoreSheet({ language, onClose, store }: StoreSheetProps) {
  const text = copy[language];
  const storeName = language === "en" ? store.nameEn || store.name : store.name;

  return (
    <>
      <button
        aria-label={text.close}
        className="sheet-backdrop"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <aside aria-label={storeName} className="store-sheet">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <p>{store.area}</p>
            <h1>{storeName}</h1>
          </div>
          <button aria-label={text.close} className="close-sheet" onClick={onClose} type="button">
            {text.close}
          </button>
        </div>

        <div className="store-status">
          <span>{store.storeStatus === "OPEN" ? text.open : text.closed}</span>
          <span>{isTicketing(store) ? text.ticketing : text.ticketingPaused}</span>
          {queueBandLabel(store, language) ? (
            <span className={`status-dot status-dot-${queueBand(store)}`}>
              {queueBandLabel(store, language)}
            </span>
          ) : null}
        </div>

        {!isTicketing(store) ? (
          <p className="ticketing-notice">{text.ticketingPausedNotice}</p>
        ) : null}

        <div className="wait-stat">
          <span>{text.waitingGroups}</span>
          <strong className={`count-${queueBand(store)}`}>{store.wait}</strong>
          <small>{text.groups}</small>
        </div>

        <div className="sheet-grid">
          <div>
            <p>{text.address}</p>
            <span>{store.address}</span>
          </div>
          <div>
            <p>{text.calledTickets}</p>
            <span>{store.storeQueue.join(", ") || "—"}</span>
          </div>
        </div>

        <section className="breakdown">
          <p>{text.queueBreakdown}</p>
          <table>
            <thead>
              <tr>
                <th>{text.table}</th>
                <th>{text.counter}</th>
                <th>{text.pair}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{store.waitingGroupTable}</td>
                <td>{store.waitingGroupCounter}</td>
                <td>{store.waitingGroupPair}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer>{text.dataSource}</footer>
      </aside>
    </>
  );
}
