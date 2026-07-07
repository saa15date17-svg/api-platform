export CORS_ALLOW_ORIGIN="http://localhost:5173;http://localhost:8080;http://localhost:5174;http://192.168.1.184:5174;http://localhost:3001;http://192.168.1.184:3001"
PORT="${PORT:-9000}"
source .venv/bin/activate || source venv/bin/activate
uvicorn open_webui.main:app --port $PORT --host 0.0.0.0 --forwarded-allow-ips "${FORWARDED_ALLOW_IPS:-*}" --reload
