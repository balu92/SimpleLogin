var Account = {
	UserName :	 	"",
	SteamID	:	 	"",
	Password :	 	"",
	ConnectedPos:		"",
	LoggedIn :	 	false,
	Spawned	:	 	false
};
	
var SimpleLogin = {
	Name		: "SimpleLogin",
	Author		: "balu92",
	Version		: "1.0.0",
	VersionNum	: 1.00,
	DStable		: "SimpleLogin",
	Dependencies: [
		["RustyPadlock", 1.01]
	],
	get Enabled () { return DataStore.Get(this.DStable + "_Config", "Enabled");},
	set Enabled (bool) { DataStore.Add(this.DStable + "_Config", "Enabled", bool);},
	get SaveMethod () { return DataStore.Get(this.DStable + "_Config", "SaveAccountsTo");}
};

(function(){
	var ok_color	= "[color #33CC33]";
	var warn_color	= "[color #FFD633]";
	
	SimpleLogin.GetDefaultPass = function(){				// done
		return this.DecryptPassword(this.Ini.Get("DefConfig", "Password"));
	};
	SimpleLogin.IsRegistered = function(Player){				// done
		switch(this.SaveMethod){
			case "ds":
				return !DataStore.Get(this.DStable + "_Accounts", Player.SteamID)?false:true;
			default:
				return Plugin.IniExists("Accounts\\" + Player.SteamID)?true:false;
		}
	};
	SimpleLogin.GetAccount = function(Player){
		switch(this.SaveMethod){
			case "ds":
				return IRWTJSON.parse(DataStore.Get(this.DStable + "_Accounts", Player.SteamID));
			default:
				return this.AccountFromIni(Player);
		}
	};
	SimpleLogin.SaveAccount = function(Player, acc){
		switch(this.SaveMethod){
			case "ds":
				DataStore.Add(this.DStable + "_Accounts", Player.SteamID, IRWTJSON.stringify(acc));
			break;
			case "ini":
				this.AccountToIni(Player, acc);
			break;
			default:
				this.AccountToIni(Player, acc);
				DataStore.Add(this.DStable + "_Accounts", Player.SteamID, IRWTJSON.stringify(acc));
			break;
		}
	};
	SimpleLogin.AccountToIni = function(Player, acc){
		if(!Plugin.IniExists("Accounts\\" + Player.SteamID)){
			var ini = Plugin.CreateIni("Accounts\\" + Player.SteamID);
			ini.AddSetting("Account", "Information", IRWTJSON.stringify(acc));
			ini.Save();
		} else {
			var ini = Plugin.GetIni("Accounts\\" + Player.SteamID);
			ini.AddSetting("Account", "Information", IRWTJSON.stringify(acc));
			ini.Save();
		}
	};
	SimpleLogin.AccountFromIni = function(Player){
		if(!Plugin.IniExists("Accounts\\" + Player.SteamID)){
			return undefined;
		} else {
			var json = Plugin.GetIni("Accounts\\" + Player.SteamID).GetSetting("Account", "Information");
			return !json?undefined:IRWTJSON.parse(json);
		}
	};
	SimpleLogin.CopyAccountsToDS = function(){
		var inis = Plugin.GetInis("Accounts\\");
		var setting, ini;
		for(ini in inis){
			setting = ini.GetSetting("Account", "Information");
			DataStore.Add(this.DStable + "_Accounts", IRWTJSON.parse(setting).SteamID, setting);
		}
	};
	SimpleLogin.CopyAccountsToIni = function(){
		var settings = DataStore.GetKeys();
	};
	SimpleLogin.Connect = function(Player){				// testme
		if(!this.IsRegistered(Player)){
			var acc	= Account;
			acc.UserName = Player.Name + "";
			acc.SteamID	= Player.SteamID + "";
			acc.Password = "";
			acc.ConnectedPos = Player.X + "|" + (Player.Y + 3) + "|" + Player.Z;
			acc.LoggedIn = false;
			acc.Spawned	= false;
			UnityEngine.Debug.Log(acc.UserName);
			Util.ConsoleLog(ok_color + "SimpleLogin: New player registered: " + Player.Name, false);
			this.SaveAccount(Player, acc);
		} else {
			var acc	= this.GetAccount(Player);
			if(acc.UserName != Player.Name){
				Util.ConsoleLog(ok_color + "SimpleLogin: " + warn_color + acc.UserName + " has changed name to: " + Player.Name, false);
				acc.UserName = Player.Name;
			}
			acc.ConnectedPos = Player.X + "|" + (Player.Y + 3) + "|" + Player.Z;
			acc.LoggedIn = false;
			acc.Spawned	= false;
			this.SaveAccount(Player, acc);
		}
	};
	SimpleLogin.Login = function(Player, Pwd){
		if(!Player) return;
		var acc	= this.GetAccount(Player);
		if(acc.Password === this.DecryptPassword(Pwd)){
			acc.LoggedIn = true;
			this.SaveAccount(Player, acc);
		} else {
			Player.MessageFrom(this.Name, warn_color + "Wrong password!");
		}
	};
	SimpleLogin.Logout = function(Player){
		if(!Player) return;
		var acc	= this.GetAccount(Player);
		if(acc.LoggedIn){
			acc.LoggedIn = false;
			acc.Spawned = false;
			this.SaveAccount(Player, acc);
		}
	};
	SimpleLogin.EncryptPassword = function(password){
		return Security.Encrypt(password, "b64");
	};
	SimpleLogin.DecryptPassword = function(password){
		return Security.Decrypt(password, "b64");
	};
	
	
}());

function On_PlayerSpawned(Player){
	SimpleLogin.Connect(Player);
}

function On_PluginInit(){
	try{
//		DataStore.Flush(SimpleLogin.DStable + "_Accounts");
		var state = Plugin.GetIni("SL_Config").GetSetting("Main", "SaveAccounts");
		var saveto = DataStore.Get(SimpleLogin.DStable + "_Config", "Config_SaveAccountsTo");
		if(!saveto) DataStore.Add(SimpleLogin.DStable + "_Config", "Config_SaveAccountsTo", "ini");
		if(state != saveto){
			switch(state){
				case "ds":
					SimpleLogin.CopyAccountsToDS();
				break;
				case "ini":
					SimpleLogin.CopyAccountsToIni();
				break;
				case "both":
					saveto=="ini"?SimpleLogin.CopyAccountsToDS():SimpleLogin.CopyAccountsToIni();
				break;
			}
			DataStore.Add(SimpleLogin.DStable + "_Config", "Config_SaveAccountsTo", state);
		}
		Plugin.CreateDir("Accounts");
	} catch(err) {
		UnityEngine.Debug.Log(String(err));
	}
}
