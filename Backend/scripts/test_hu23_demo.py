"""Smoke with synthetic no-face image; no photographs of people or image files."""
import json
import uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import cv2
import numpy as np

API='http://127.0.0.1:3003/demo/hu23'
session=''
def call(path,data=None,field=None):
    headers={'Content-Type':'application/json','X-HU23-Session':session}
    body=None if data is None else json.dumps(data).encode() if not field else data
    if field:
        boundary='Hu23'+uuid.uuid4().hex
        headers['Content-Type']='multipart/form-data; boundary='+boundary
        body=(f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+data+f'\r\n--{boundary}--\r\n'.encode())
    try:
        with urlopen(Request(API+path,data=body,headers=headers),timeout=40) as r:return r.status,json.loads(r.read())
    except HTTPError as e:return e.code,json.loads(e.read())

if __name__=='__main__':
    status,health=call('/health');assert status==200 and health['disponible'] and health['postgres'] is False
    print('PASS real models and startup without PostgreSQL')
    status,user=call('/session',{'email':'estudiante@hu23.local','password':'Hu23Demo!26'});assert status==201
    session=user['accessToken'][10:]
    status,exams=call('/estudiantes/me/examenes');assert status==200 and len(exams['examenes'])==2
    print('PASS student and existing exams contract')
    status,result=call('/estudiantes/me/examenes/2301/qr',{});assert status==400 and 'token' not in result
    _,image=cv2.imencode('.png',np.zeros((640,640,3),np.uint8))
    status,result=call('/estudiantes/me/foto',image.tobytes(),'foto');assert status==400 and result['codigo']=='SIN_ROSTRO'
    print('PASS missing selfie and real no-face rejection')
    status,_=call('/ingresos/qr',{'token':'invalid','examenId':2301});assert status==403
    status,user=call('/session',{'email':'control@hu23.local','password':'Hu23Demo!26'});assert status==201
    session=user['accessToken'][10:]
    status,_=call('/control-ingreso/mis-examenes');assert status==200
    status,_=call('/ingresos/qr',{'token':'invalid.token.signature','examenId':2301});assert status==400
    print('PASS control role, isolation and invalid signature')
    print('PENDING MANUAL: same person, different person, multiple real faces, valid QR camera scan')
