import json
from urllib import request

url = 'http://127.0.0.1:8001/api/v1/scheduler/decide'
payload = {
    "readiness_level": "HIGH",
    "retention_probability": 0.42,
    "priority_score": 0.71
}
data = json.dumps(payload).encode('utf-8')
req = request.Request(url, data=data, headers={'Content-Type': 'application/json'})
resp = request.urlopen(req)
print(resp.read().decode())
