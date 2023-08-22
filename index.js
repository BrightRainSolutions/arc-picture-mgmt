import EsriConfig from 'https://js.arcgis.com/4.27/@arcgis/core/config.js';
import FeatureLayer from "https://js.arcgis.com/4.27/@arcgis/core/layers/FeatureLayer.js";
import Map from 'https://js.arcgis.com/4.27/@arcgis/core/Map.js';
import MapView from 'https://js.arcgis.com/4.27/@arcgis/core/views/MapView.js';
import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'

createApp({
  data() {
    return {
      files: [],
	  snacks: [{ message: "" }],
	  featureLayerUrl: "https://services7.arcgis.com/vVpN3IL0Y4nustY6/ArcGIS/rest/services/MOHEWorkRecords/FeatureServer/0/",
	  selectedOid: 4,
	  currentAttachments: [],
	  currentWorkRecords: [],
	  currentWorkRecord: {
		action: "",
		date: "",
		time: ""
	  },
	  currentSiteName: "",
	  currentSiteId: 0,
	  bigPictureSource: "",
	  isShowingBigPicture: false,
	  isShowingPictures: false,
	  sitesLayer: Object,
	  workLayer: Object
    }
  },
  mounted() {
	// PWA support: register service worker
	if ("sw" in navigator) {
		window.addEventListener("load", () => {
			navigator.serviceWorker
				.register("/sw.js")
				.then(res => console.log("service worker registered"))
				.catch(err => console.log("service worker not registered", err))
		})
	}
	EsriConfig.apiKey = "AAPK7f0624e696e04015b9c410743b9f9066bBcF0v6zJP3GLijOE8ODrEKaVmIHJE3qAEzxd_gx8fCGtCivYtkqz8DQaHBsqlHu";
	const map = new Map({
		basemap: "topo-vector"
	});
	
	const view = new MapView({
		map: map,
		center: [-122.4, 47.6],
		zoom: 11,
		container: "map-view"
	});

	const workLayer = new FeatureLayer({
		visible: false,
		portalItem: {
			id: "2bbadf2f5ea54cf79c075670f129246f"
		}
	});
	map.add(workLayer);

	const sitesLayer = new FeatureLayer({
		portalItem: {
			id: "79432d649f864ed7aba8a3a925bd2724"
		},
		outFields: ['*'],
		popupEnabled: false
	});
	map.add(sitesLayer);

	view.on("click", event => {
		// 
		const opts = {
			include: sitesLayer
		  }
		view.hitTest(event, opts).then(response => {
			// clear work records and pictures no matter what
			// including clicking on a non-site
			this.currentWorkRecord = {
				action: "",
				date: "",
				time: ""
			};
			this.currentWorkRecords = [];
			this.currentAttachments = [];
			this.isShowingPictures = false;
			if (response.results?.length > 0) {
			this.currentSiteName = response.results[0].graphic.attributes.LOC_NAME;
			this.currentSiteId = response.results[0].graphic.attributes.SITE_ID;
			// call method to get work records for this site
			this.showSiteWorkRecords(workLayer, this.currentSiteId);
		  }
		});
	  });
  },
  methods: {
	showSiteWorkRecords(workLayer, siteId) {
		const query = { where: `SITE_ID = ${siteId}`, outFields: ['*'] };
		workLayer.queryFeatures(query).then(results => {
			results.features.forEach(feature => {
				let workDate = new Date(feature.attributes.ACTION_DATE);
				const wr = {
					oid: feature.attributes.OBJECTID,
					date: workDate.toLocaleDateString("medium"),
					time: workDate.toLocaleTimeString("medium"),
					action: feature.attributes.WORKACTION
				}
				this.currentWorkRecords.push(wr);
			});
		});
	},
	async uploadImages() {
		for (let i = 0; i < this.files.length; i++) {
			const file = this.files[i];
			let formData = new FormData();
			formData.append("file", file);
			formData.append("f", "json");
	
			try {
				const url = this.featureLayerUrl + this.selectedOid + "/addAttachment";
				const response = await fetch(url, {
					method: 'POST',
					body: formData
				});
				const result = await response.json();

				if (result.addAttachmentResult.success) {
					this.snackTime(`Successfully uploaded image: ${file.name}`);
					console.log(`Successfully uploaded image: ${file.name}`);
				} else {
					this.snackTime(`Failed to upload image: ${file.name}`);
					console.log(`Failed to upload image: ${file.name}`);
				}
			}
			catch(e) {
				console.log(e);
			}
		}
		// clear the selected files regardless
		this.files = [];
		this.fetchFeatureAttachments();
	},
	async deleteAttachment(attachment) {
		let formData = new FormData();
		formData.append("attachmentIds", attachment.id);
		formData.append("f", "json");

		try {
			const url = this.featureLayerUrl + this.selectedOid + "/deleteAttachments?f=json";
			const response = await fetch(url, {
				method: 'POST',
				body: formData
			});
			const result = await response.json();

			if (result.deleteAttachmentResults[0].success) {
				this.snackTime(`Successfully deleted image: ${attachment.name}`);
				console.log(`Successfully deleted image: ${attachment.name}`);
				this.fetchFeatureAttachments();
			} else {
				this.snackTime(`Failed to deleted image: ${attachment.name}`);
				console.log(`Failed to deleted image: ${attachment.name}`);
				console.log(result.deleteAttachmentResults[0].error.description);
			}
		}
		catch(e) {
			console.log(e);
		}
	},
	getPictures(workRecord) {
		this.currentWorkRecord = workRecord;
		this.selectedOid = workRecord.oid;
		this.isShowingPictures = true;
		this.fetchFeatureAttachments();
	},
	async fetchFeatureAttachments() {
		try {
			const url = this.featureLayerUrl + this.selectedOid + "/attachments?f=json";
			const response = await fetch(url);
			const attachments = await response.json();
			if (attachments) {
				this.currentAttachments = [];
				attachments.attachmentInfos.forEach(attachment => {
					const a = {
						name: attachment.name,
						id: attachment.id,
						url: `${this.featureLayerUrl}${this.selectedOid}/attachments/${attachment.id}`
					}
					this.currentAttachments.push(a);
				});
			}
		}
		catch(e) {
			console.log(e);
		}
	},
	clearFiles() {
		// clear the selected files
		this.files = [];
	},
	refreshFiles(event) {
		// Convert the FileList to an array and update the 'files' data property
		this.files = Array.from(event.target.files);
	},
	showBigPicture(source) {
		this.bigPictureSource = source;
		this.isShowingBigPicture = true;
	},
	snackTime(snackWords) {
		// Get the snackbar DIV
		var snacky = document.getElementById("snackbar");
		snacky.innerHTML = snackWords;
	  
		// Add the "show" class
		snacky.className = "show";
	  
		// After 3 seconds, remove the show class
		setTimeout(() => { snacky.className = snacky.className.replace("show", ""); }, 3000);
	  } 
  }
}).mount('#app')