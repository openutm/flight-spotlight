## A file to import flight data into the Tile 38 instance. 

import redis
import csv
import time
import requests 
from dotenv import load_dotenv, find_dotenv
from os import environ as env
ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)


class PassportCredentialsGetter():
    def __init__(self):
        pass

    def get_write_credentials(self):
        payload = "grant_type=client_credentials&client_id="+ env.get('PASSPORT_CLIENT_ID')+"&client_secret="+ env.get('PASSPORT_CLIENT_SECRET')+"&audience="+ env.get('PASSPORT_AUDIENCE')+"&scope="+ env.get('PASSPORT_SCOPE')
        
        headers = { 'content-type': "application/x-www-form-urlencoded"}
        url = env.get('PASSPORT_URL') +'/oauth/token/'
        print(payload)
        token_data = requests.post(url, data = payload, headers = headers)
        t_data = token_data.json()
        
        return t_data


class Tile38Uploader():
    
    def __init__(self):
        self.client = redis.Redis(host='127.0.0.1', port=9851)        
        self.timestamps = [1590000000000,1590000005000, 1590000010000,1590000015000, 1590000020000] 
        self.cred = self.get_write_credentials()
    
    def upload_to_server(self, filename, token):
        with open(filename, "r") as csvfile:
            datareader = csv.reader(csvfile)
            next(datareader)
            
            for row in datareader:
                icao_address = 'dji-mavic'
                traffic_source = 3
                source_type = 0
                lat_dd = row[1]
                lon_dd = row[0]
                time_stamp = row[2]
                altitude_mm = row[3]
                print(icao_address, lat_dd, lon_dd, time_stamp, altitude_mm)
                # result = self.client.execute_command('SET', 'fleet', icao_address, 'FIELD', 'traffic_source ', traffic_source , 'FIELD', 'source_type' ,source_type, 'FIELD', 'time_stamp' ,time_stamp,'POINT', lat_dd,lon_dd,altitude_mm)
                result = self.client.execute_command('SET', 'fleet', icao_address, 'POINT', lon_dd, lat_dd, altitude_mm)
                # print(result)
                print("Sleeping 5 seconds..")
                time.sleep(5)
                
                

if __name__ == '__main__':

    # my_uploader = Tile38Uploader()
    my_credentials = PassportCredentialsGetter()
    credentials = my_credentials.get_write_credentials()
    print(credentials)
    # my_uploader.upload_to_server(filename='micro-flight-data.csv')