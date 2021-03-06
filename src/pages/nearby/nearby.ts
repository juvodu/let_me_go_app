import { Component, ViewChild } from '@angular/core';
import { NavController, LoadingController, ModalController, VirtualScroll } from 'ionic-angular';
import { SpotService } from '../../providers/service.spot';
import { DetailPage } from '../detail/detail';
import { NearbyfilterPage } from '../nearbyfilter/nearbyfilter';
import { AppSettings } from '../../providers/app.settings';
import { Analytics } from 'aws-amplify';

@Component({
  selector: 'page-nearby',
  templateUrl: 'nearby.html',
})
export class NearbyPage {

  @ViewChild(VirtualScroll) virtualScroll: VirtualScroll;

  spots: any = [];
  loadingMessage: string = "Searching for spots nearby...";
  userFeedback: string = null;

  //filter
  distance: number = AppSettings.NEARBY_DEFAULT_DISTANCE;
  filter: string;

  constructor(private navCtrl: NavController,
              private loadingCtrl: LoadingController,
              private spotService: SpotService,
              private modalCtrl: ModalController) {
              
              this.filter = this.getFilterDesc();
              this.getSpotsNearbyLoadingAlert();
  }

  /**
   * Show alert while loading spots nearby
   */
  getSpotsNearbyLoadingAlert(){
    
    let loading = this.loadingCtrl.create({
      content: this.loadingMessage
    });
    loading.present();
    this.getSpotsNearby(()=>loading.dismiss());
  }

  /**
   * Show refresher while loading spots nearby
   */
  getSpotsNearbyRefresher(refresher){
    
    this.getSpotsNearby(()=>{
        this.virtualScroll.readUpdate(true);
        refresher.complete();
      });
  }

  private getFilterDesc(){
    return "Max distance: " + this.distance + " km";
  }

  private getSpotsNearby(callback){

    this.userFeedback = null;
    this.spotService.getSpotsNearby(this.distance).then((spots) => {
      
      if(spots.length == 0){
        this.userFeedback = "No spots found nearby..."
      }
      spots.forEach(spot=>{
        if(spot.thumbnail == null){
          spot.thumbnail = AppSettings.DEFAULT_IMAGE_PATH;
        }
      });
      this.spots = spots;
      callback();
      
    }).catch((error) => {
      
      this.userFeedback = error.message;
      Analytics.record('Error', { message : error.message});
      callback();
    });
  }

  itemTapped(event, spot) {
    this.navCtrl.push(DetailPage, {
      spotId: spot.id
    });
  }

  showFilterModal(){

    let filterModal = this.modalCtrl.create(
      NearbyfilterPage, 
      { 
        distance: this.distance,
    });
    filterModal.onDidDismiss(data => {
      this.distance = data.distance;

      // reload spots if filter changed
      if(this.getFilterDesc() != this.filter){
        this.filter = this.getFilterDesc();
        this.getSpotsNearbyLoadingAlert();
      }

    });
    filterModal.present();
  }
}
