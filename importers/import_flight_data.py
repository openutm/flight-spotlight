## A file to import flight data into the Tile 38 instance. 

import redis
import csv
import time

class Tile38Uploader():
    
    def __init__(self):
        self.client = redis.Redis(host='127.0.0.1', port=9851)
        
        self.timestamps = [1590000000000,1590000005000, 1590000010000,1590000015000, 1590000020000]
    
    
    def upload_to_server(self, filename):
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
    my_uploader = Tile38Uploader()
    my_uploader.upload_to_server(filename='micro-flight-data.csv')