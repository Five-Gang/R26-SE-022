import json
from urllib import request

url = 'http://127.0.0.1:8001/api/v1/sm2/process'
payload = {"item": {"item_id": "demo_item"}, "quality_percentage": 85, "readiness_level": "HIGH"}
data = json.dumps(payload).encode('utf-8')
req = request.Request(url, data=data, headers={'Content-Type': 'application/json'})
resp = request.urlopen(req)
print(resp.read().decode())
