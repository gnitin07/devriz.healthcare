import { useContent } from "../lib/ContentContext";

/** "1M+ happy customers" → ["1M+", "happy customers"] */
const splitStat = (s) => {
  const [head, ...rest] = s.split(" ");
  return [head, rest.join(" ")];
};

const StatsStrip = () => {
  const { settings } = useContent();
  const stats = settings.stats || [];
  if (!stats.length) return null;

  return (
    <div className="stats-strip">
      <div className="stats-inner">
        {stats.map((s) => {
          const [big, label] = splitStat(s);
          return (
            <div className="stat" key={s}>
              <strong>{big}</strong>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsStrip;
