
var userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1"

function function1(arg)
{

	//var var1 = new Date() / 1000;
	var var1 = 1538036548.83;
	var var4 = 65521;
	var var2 = var1 % var4;
	//console.log(var2 * var4)
	var var3 = (var1 ^ (var2 * var4))
	var1 = var3 >>> 0
	var var6 = function2(var1.toString(), 0);
	var var7 = function3(var1 >> 2)
	
	var var5 = var1 / 4294967296.0;
	var var5 = var5 << 16;
	var var8 = var5 | var2;
	var var9 = var3 << 28;
	var9 = var9 | (var8 >>> 4);
	var var10 = function3(var9);
	var10 = var7.concat(var10); //两次结果拼接
	
	var var11 = -1 ^　var1; //20``24
	var var12 = var2 << 26; //-46``48
	var var13 = var12 | (var11 >>> 6)
	var var14 = function3(var13)
	var14 = var10.concat(var14);
	var14 = var14.concat(String.fromCharCode(function4(var11 & 63)));//不知道这个里是什么结构

	
	var var15 = function2(userAgent, var6);
	var var16 = var15 % var4;
	var var17 = var16 << 16;

	//var6 arg
	var var18 = function2(arg, var6);
	var var19 = var18 % var4;
	var var20 = var17 | var19;
	var var21 = var20 >> 2;
	var var22 = function3(var21);
	var22 = var14.concat(var22);

	
	var var23 = 0 << 8;
	var23 = var23 | 16;
	var23 = var23 ^ var1;
	var23 = var23 >>> 4;
	var var24 = var20 << 28;
	var var25 = var23 | var24;
	var var26 = function3(var25);
	var26 = var22.concat(var26);
	console.log(var26);


}


function function2(var1, var2)
{
	var temp = var2 //1328477132
	for(var i = 0; i < var1.length; i++)
	{
		temp = 65599 * temp + var1[i].charCodeAt() >>> 0;
	}
	return temp;
}

function function3(var0)
{
	var str = "";
	
	for(var i = 24; i >= 0; i-=6)
	{
		var var1 = (var0 >> i) & 63;
		
		var chr = function4(var1)
		str += String.fromCharCode(chr);
	}
	
	return str;
}


function function4(var1)
{
	var chr = ''
	if(var1 < 26)
	{
		chr = var1 + 65;
		//unkown 65
	}
	else if(var1 < 52)
	{
		chr = var1 + 71;
		//unkown 71
	}
	else if(var1 < 62)
	{
		chr = var1 - 4;
	}
	else if(var1 == 62)
	{
		chr = 45;
	}
	else
	{
		chr = 46;
	}
	
	return chr;
}


function1("71158571905");