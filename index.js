import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'

createApp({
  data() {
    return {
      files: [],
	  snacks: [{ message: "" }],
	  featureLayerUrl: "https://services7.arcgis.com/vVpN3IL0Y4nustY6/ArcGIS/rest/services/MOHEWorkRecords/FeatureServer/0/",
	  selectedOid: 4,
	  currentAttachments: []
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
	this.fetchFeatureAttachments();
  },
  methods: {
	async uploadImages() {
		for (let i = 0; i < this.files.length; i++) {
			const file = this.files[i];
			let formData = new FormData();
			formData.append('file', file);
	
			try {
				const url = this.featureLayerUrl + this.selectedOid + "/addAttachment";
				const response = await fetch(url, {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
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
		//document.getElementById('uploadFile').value = '';
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
			} else {
				
			}
		}
		catch(e) {
			console.log(e);
		}
	},
	refreshFiles(event) {
		// Convert the FileList to an array and update the 'files' data property
		this.files = Array.from(event.target.files);
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