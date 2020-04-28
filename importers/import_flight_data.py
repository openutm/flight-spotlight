## A file to import flight data into the Tile 38 instance. 

import redis
import csv
import time
class Tile38Uploader():
    
    def __init__(self):
        self.client = redis.Redis(host='127.0.0.1', port=9851)
    # insert data
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
                time_stamp = row[3]
                altitude_mm = row[2]
                print(icao_address, lat_dd, lon_dd, time_stamp, altitude_mm)
                # result = self.client.execute_command('SET', 'fleet', icao_address, 'FIELD', 'traffic_source ', traffic_source , 'FIELD', 'source_type' ,source_type, 'FIELD', 'time_stamp' ,time_stamp,'POINT', lat_dd,lon_dd,altitude_mm)
                result = self.client.execute_command('SET', 'fleet', icao_address, 'POINT', lon_dd, lat_dd)
                # print(result)
                print("Sleeping 3 seconds..")
                time.sleep(3)
                
                
                
        # # print result
    # print result
    # # get data
    # print client.execute_command('GET', 'fleet', 'truck')

if __name__ == '__main__':
    my_uploader = Tile38Uploader()
    my_uploader.upload_to_server(filename='micro-flight-data.csv')