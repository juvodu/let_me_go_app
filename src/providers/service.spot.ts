import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import { Http, Response, RequestOptions, Headers, URLSearchParams } from '@angular/http';
import { Geolocation, GeolocationOptions } from '@ionic-native/geolocation';
import { Diagnostic } from '@ionic-native/diagnostic';
import { Observable } from 'rxjs/Observable';
import { AppSettings } from './app.settings';
import { Analytics } from 'aws-amplify';
import 'rxjs/add/operator/map';

/**
 * Service for retrieving surfspots
 * 
 * @author Juvodu
 */
@Injectable()
export class SpotService {

    // geolocation options - 10 min age - 5s timoute - no high accuracy
    private geoLocationOptions: GeolocationOptions = { maximumAge: 600000, timeout: 10000, enableHighAccuracy: false };
    private headers: Headers;

    constructor(private http: Http,
                private geolocation: Geolocation,
                private diagnostic: Diagnostic,
                private platform: Platform) {

        this.headers = new Headers();
        this.headers.append('x-api-key', AppSettings.SPOT_API_KEY);
    }

    /**
     * Get spot with detailed information including weather forecast
     * 
     * @param user 
     *          the currently logged in user
     * @param spotId 
     *          the id of the spot
     */
    getSpotById(user:any, spotId:string): Observable<any>{
        
        let options:RequestOptions = new RequestOptions({headers: this.headers});
        let params: URLSearchParams = new URLSearchParams();
        params.set('spotId', spotId);
        params.set('username', user.username);        
        options.params = params;

        Analytics.record('GetSpotById', params.paramsMap);
        let spot: any = this.http.get(AppSettings.SPOT_API_ENDPOINT + "spot", options)
             .map((res:Response) => res.json());
        return spot;
    }

    /**
     * Get all favorite spots for the user
    * @param user 
     *          the currently logged in user
     * @param limit
     *             the optional limit of returned results
     */
    getFavoriteSpots(user:any, limit: number): Observable<any>{
        
        let options:RequestOptions = new RequestOptions({headers: this.headers});
        let params: URLSearchParams = new URLSearchParams();
        params.set('username', user.username);

        // set the optional limit parameter
        if(limit != null){
            params.set('limit', limit.toString());
        }

        options.params = params;

        Analytics.record('GetFavoriteSpots', params.paramsMap);
        let spots: any = this.http.get(AppSettings.SPOT_API_ENDPOINT + "spots", options)
             .map((res:Response) => res.json());
        return spots;
    }

    /**
     * Get all spots for a specific region
     * 
     * @param continent
     *             the required continent iso code to filter by
     * @param country
     *             the optional country iso code to filter by
     * @param limit
     *             the optional limit of returned results
     */
    getSpotsByRegion(continent: string, country: string, limit: number): Observable<any>{

        let options:RequestOptions = new RequestOptions({headers: this.headers});
        let params: URLSearchParams = new URLSearchParams();
        params.set('continent', continent);

        // set the optional country parameter
        if(country != null){
            params.set('country', country);
        }

        // set the optional limit parameter
        if(limit != null){
            params.set('limit', limit.toString());
        }

        options.params = params;

        Analytics.record('GetSpotsByRegion', params.paramsMap);
        let spots = this.http.get(AppSettings.SPOT_API_ENDPOINT + "spots", options)
             .map((res:Response) => res.json());
        return spots;
    }

   /**
    * Get spots within a specific distance
    * 
    * @param lat 
    * @param long 
    * @param distance 
    */
    getSpotsByDistance(lat: number, lon: number, distance: number): Observable<any>{

        let options:RequestOptions = new RequestOptions({headers: this.headers});
        let params: URLSearchParams = new URLSearchParams();
        params.set('lat', String(lat));
        params.set('lon', String(lon));
        params.set('distance', String(distance));
        options.params = params;

        Analytics.record('GetSpotsByDistance', params.paramsMap);
        let spots = this.http.get(AppSettings.SPOT_API_ENDPOINT + "spots", options)
             .map((res:Response) => res.json());
        return spots;
    }

    /**
     * Get spots neary, uses the geo native plugin to retrieve current user position
     * 
     * @param distance 
     */
    getSpotsNearby(distance: number): Promise<any>{

        return new Promise((resolve, reject)=>{
            
            // check that gps is available on mobile apps
            if (! this.platform.is('core') && !this.platform.is('mobileweb')) {
                this.diagnostic.isLocationEnabled().then((gpsAvailable) =>{
                    
                    if(gpsAvailable == false){
                        reject(new Error("GPS not enabled"));
                        return;
                    }
                }).catch((err) => {
                    reject(err);
                    return;
                });
            }

            // retrieve users geolocation
            this.geolocation.getCurrentPosition(this.geoLocationOptions).then((resp) => {
            
            let latitude = resp.coords.latitude;
            let longitude = resp.coords.longitude;

            // search spots by distance
            this.getSpotsByDistance(latitude, longitude, distance).subscribe(
                (spots) => {
                    resolve(spots);
                },
                (error) =>{
                    reject(new Error(error));
                }
            );

            }).catch((error) => {
                reject(error);
            });
        });
    }
}