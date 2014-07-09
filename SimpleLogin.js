var Account = {
	UserName :	 	"",
	SteamID	:	 	"",
	Password :	 	"",
	ConnectedPos:	"",
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
	
	SimpleLogin.Init = function(){
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
		Util.ConsoleLog(ok_color + "SimpleLogin: Loaded!", true);
		UnityEngine.Debug.Log("SimpleLogin: Loaded!");
		if(DataStore.GetTable(this.DStable + "_Spawner").Count){
			Plugin.CreateTimer("SL_Spawner", parseInt(this.GetConfig("SpawnerInterval"))).Start();
		}
	};
	
	SimpleLogin.GetDefaultPass = function(){				// done
		return this.DecryptPassword(this.GetConfig("DefConfig", "Password"));
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
			Util.ConsoleLog(ok_color + "SimpleLogin: New player registered: " + Player.Name, false);
			this.SaveAccount(Player, acc);
			DataStore.Add(this.DStable + "_Spawner", Player.SteamID, IRWTJSON.stringify(acc));
		} else {
			var acc	= this.GetAccount(Player);
			if(acc.UserName != Player.Name){
				Util.ConsoleLog(ok_color + "SimpleLogin: " + warn_color + acc.UserName + " has changed name to: " + Player.Name, false);
				acc.UserName = Player.Name;
			}
			acc.ConnectedPos = Player.X + "|" + (Player.Y + 1) + "|" + Player.Z;
			acc.LoggedIn = false;
			acc.Spawned	= false;
			this.SaveAccount(Player, acc);
			DataStore.Add(this.DStable + "_Spawner", Player.SteamID, IRWTJSON.stringify(acc));
		}
		if(!Plugin.GetTimer("SL_Spawner")){
			Plugin.CreateTimer("SL_Spawner", parseInt(this.GetConfig("SpawnerInterval"))).Start();
		}
	};
	SimpleLogin.SetPassword = function(Player, args){
		if(!Player) return;
		var acc	= this.GetAccount(Player);
		var pwd = argsToPass(args);
		if(pwd){
			acc.Password = this.EncryptPassword(pwd) + "";
			this.SaveAccount(Player, acc);
		}
	};
	
	SimpleLogin.Login = function(Player, args){
		if(!Player) return;
		var acc	= this.GetAccount(Player);
		var pwd = argsToPass(args);
		if(acc.Password == this.EncryptPassword(pwd)){
			acc.LoggedIn = true;
			this.SaveAccount(Player, acc);
			DataStore.Remove(this.DStable + "_Spawner", Player.SteamID);
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
	
	SimpleLogin.GetConfig = function(config){
		return Plugin.GetIni("SL_Config").GetSetting("Main", config);
	};
	
	SimpleLogin.Spawner = function(){
		var players = DataStore.Values(this.DStable + "_Spawner");
		if(!players) Plugin.KillTimer("SL_SpawnerCallback");
		for(var i = 0; i < players.Length; i++){
			var player = players[i];
			var pl = IRWTJSON.parse(player);
			var Player = Magma.Player.FindBySteamID(pl.SteamID);
			if(!Player) continue;
			var pos = pl.ConnectedPos.split("|");
			Player.TeleportTo(parseFloat(pos[0]), parseFloat(pos[1]), parseFloat(pos[2]));
		}
	};
	
	function argsToPass(args){
		var pass = "";
		if(args.Length > 0){
			for(var i = 0; i < args.Length; i++) pass==""?pass+=args[i]:pass+=" "+args[i];
		} else {
			return undefined;
		}
		return pass==""?undefined:pass;
	};
	
}());

function On_PlayerSpawned(Player){
	if(DataStore.Get(SimpleLogin.DStable + "_FirstSpawn", Player.SteamID)){
		SimpleLogin.Connect(Player);
		DataStore.Add(SimpleLogin.DStable + "_FirstSpawn", Player.SteamID, false);
	}
}

function On_PlayerConnected(Player){
	DataStore.Add(SimpleLogin.DStable + "_FirstSpawn", Player.SteamID, true);
}

function On_PlayerDisconnected(Player){
	if(DataStore.Get(SimpleLogin.DStable + "_Spawner", Player.SteamID))
		DataStore.Remove(SimpleLogin.DStable + "_Spawner", Player.SteamID);
	SimpleLogin.Logout(Player);
}

function On_ServerInit(){
	DataStore.Flush(SimpleLogin.DStable + "_Spawner");
}

function On_PluginInit(){
	try{
		SimpleLogin.Init();
	} catch(err){
		UnityEngine.Debug.Log(String(err));
	}
}

function On_Command(Player, cmd, args){
	switch(cmd){
		case "password":
		case "setpw":
			if(args.Length > 0)
				SimpleLogin.SetPassword(Player, args);
			else Player.Message("/password password");
		break;
		case "login":
			if(args.Length > 0)
				SimpleLogin.Login(Player, args);
			else Player.Message("/login password");
		break;
	}
}

function SL_SpawnerCallback(){
	SimpleLogin.Spawner();
}
