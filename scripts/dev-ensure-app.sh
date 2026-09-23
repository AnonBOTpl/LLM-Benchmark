#!/usr/bin/env bash
# Uruchamia okno aplikacji, jesli nie stoi. Proces dev nie przezywa miedzy
# komendami, wiec kazda komenda, ktora chce testowac UI, wola to najpierw.
ensure_app() {
  if curl -s -m 2 http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
    return 0
  fi

  # Stary serwer dev na 1420 blokowalby nowy start, wiec go ubijamy.
  local stale
  stale=$(netstat -ano 2>/dev/null | grep LISTENING | grep ":1420" | tr -s ' ' | awk '{print $5}' | head -1)
  [ -n "$stale" ] && taskkill //PID "$stale" //F //T >/dev/null 2>&1

  rm -f /tmp/vite.log
  nohup npm run dev > /tmp/vite.log 2>&1 &
  local i
  for i in $(seq 1 40); do
    netstat -ano 2>/dev/null | grep LISTENING | grep -q ":1420" && break
    sleep 1
  done

  nohup ./src-tauri/target/debug/ai-benchmark.exe > /dev/null 2>&1 &
  for i in $(seq 1 40); do
    curl -s -m 2 http://127.0.0.1:9222/json/version >/dev/null 2>&1 && { sleep 3; return 0; }
    sleep 1
  done
  echo "APLIKACJA NIE WSTALA" >&2
  return 1
}
