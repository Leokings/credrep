"use client";

import type { Market, Outcome, UserForecast } from "../lib/product-data";
import { ArrowIcon, CheckIcon, ClockIcon } from "./icons";

type Props = {
  market: Market;
  forecast?: UserForecast;
  onForecast: (market: Market, outcome: Outcome) => void;
  featured?: boolean;
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatLock(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function MarketCard({ market, forecast, onForecast, featured }: Props) {
  const noProbability = 100 - market.yesProbability;
  return (
    <article className={`market-card ${featured ? "market-card-featured" : ""}`}>
      <div className="market-card-topline">
        <span className="market-eyebrow">{market.eyebrow}</span>
        <span className="market-status">
          <span aria-hidden="true" className="market-status-dot" />
          {market.status === "OPEN" ? "Forecasting open" : market.status}
        </span>
      </div>

      <h3>{market.question}</h3>

      <div className="probability-block" aria-label={`Crowd forecast: ${market.yesProbability}% yes`}>
        <div className="probability-labels">
          <span><strong>{market.yesProbability}%</strong> YES</span>
          <span><strong>{noProbability}%</strong> NO</span>
        </div>
        <div className="probability-track">
          <span className="probability-fill" style={{ width: `${market.yesProbability}%` }} />
        </div>
      </div>

      <div className="market-actions">
        {forecast ? (
          <div className="forecast-locked">
            <CheckIcon />
            <span>
              You forecast <strong>{forecast.outcome} · {forecast.confidence}%</strong>
            </span>
            <span className="forecast-stake">{forecast.stake} CC locked</span>
          </div>
        ) : (
          <>
            <button className="forecast-button forecast-button-yes" onClick={() => onForecast(market, "YES")} type="button">
              Forecast YES
              <ArrowIcon />
            </button>
            <button className="forecast-button forecast-button-no" onClick={() => onForecast(market, "NO")} type="button">
              Forecast NO
            </button>
          </>
        )}
      </div>

      <footer className="market-card-footer">
        <span><ClockIcon /> Locks {formatLock(market.lockAt)}</span>
        <span>{formatCompact(market.volume)} CC</span>
        <span>{formatCompact(market.forecasters)} forecasters</span>
        <span className={market.signal.startsWith("-") ? "signal-down" : "signal-up"}>{market.signal}</span>
      </footer>
    </article>
  );
}
