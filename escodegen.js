(function () {
    'use strict';

    var Syntax,
        Precedence,
        BinaryPrecedence,
        SourceNode,
        estraverse,
        esutils,
        base,
        indent,
        json,
        renumber,
        hexadecimal,
        quotes,
        escapeless,
        newline,
        space,
        parentheses,
        semicolons,
        safeConcatenation,
        directive,
        extra,
        parse,
        sourceMap,
        sourceCode,
        preserveBlankLines,
        FORMAT_MINIFY,
        FORMAT_DEFAULTS;

    estraverse = require('estraverse');
    esutils = require('esutils');


    Syntax = estraverse.Syntax;

	//******************************添加的编译代码 开始**********************************
	var my_stack = []  //临时栈
    var my_varIDX = [] //变量索引栈
    var tier = 1 //层数默认为100, 
    var esp = 15  //指针, 因为未考虑函数调用层级, 所以每次调用都会拷贝变量取, 设置15起始, 避免被参数覆盖,
    var vm_str = '' 
    var tempIDXCount = 0  //下面数组的索引
    var tempIDX = [] //临时记录的index数组
    var ifESIDXCount = 0
    var ifESIDX = [] 
    var func_retn_count = []; //函数返回值数量计数

	var OPCODE = {
        RETURN:0,
        PUSH_NOT_STACKTOP:1,
        PUSH_VALUE:14,
		EXPRESSION:66,
        PUSH_NUM : 73,
        PUSH_FLOAT_VALUE : 95,
        MOV_VARS: 83,
        MY_MOV_VARS: 94,
        PUSH_VAR : 76,
        PUSH_FUNC : 89,
        PUSH_STACK_ARRAY : 59,
        APPLY :　67,
        PUSH0 : 70,
        PUSH_NULL : 90,
        IS_TURE : 75,
        SKIP_BLOCK : 74,
        EXPRESSION2 : 68,
        PUSH_NOT_STACK_TOP : 1,
        PUSH_THIS : 71,
        GET_OBJ : 82,
        NEW_OBJ : 78,
        PUSH_SUBSTR : 4,
        GET_ARY_VALUE : 96,
        SET_ARY_VALUE : 97,
        EXPRESSION_SINGLE : 98,
        XOR_DECODE : 12,
        SET_GLOBAL_VALUE : 99,
    }


    //getIDX
    function getIDX(var_name)
    {
        if(var_name == 'length')
        {
            return undefined
        }
        
        for(var i = tier; i > 0; i--)
        {
            var temp = my_varIDX['$'+ i][var_name];//先检查普通

            if(temp != undefined){
                if(typeof(temp) != 'number')
                    return undefined
            
                return temp;
            }
        }
    }

    //push obj
    function push_obj(stmt)
    {
        var object_name = stmt.name
        var IDX = getIDX(object_name)
        if(IDX == undefined)
        {
            vm_str+=String.fromCharCode(OPCODE.PUSH_THIS + 32);
            vm_str+=String.fromCharCode(OPCODE.GET_OBJ + 32);
            vm_str+=String.fromCharCode(object_name.length + 32);
            vm_str+=object_name;
        }
        else
        {
            push_var(IDX)
        }
    }

    //push 运算符
    function push_symbol(stmt, left_name)
    {
        if(stmt.operator.length > 1)
        {
            vm_str+=String.fromCharCode(OPCODE.EXPRESSION2 + 32);
            vm_str+=String.fromCharCode(stmt.operator.length + 32);//计算符号大于1
            vm_str+=stmt.operator;

            if(!is_clac_bool(stmt.operator))
            {
                if(stmt.left.type == 'MemberExpression')
                    member_mov(stmt)
                else           
                    mov_var(getIDX(left_name))
            }
        }
        else if(stmt.type == 'UnaryExpression')
        {
            vm_str+=String.fromCharCode(OPCODE.EXPRESSION_SINGLE + 32);  
            vm_str+=stmt.operator; 
        }
        else
        {
            vm_str+=String.fromCharCode(OPCODE.EXPRESSION + 32);
            vm_str+=stmt.operator; 
        }
    }

    //用于递归调用的计算函数
    function myExpression(stmt, clac_tier)
    {
        var push_num;
        if(stmt.type == 'BinaryExpression' || stmt.type == 'AssignmentExpression')
        {
            //递归调用
            myExpression(stmt.left, clac_tier+1)
            myExpression(stmt.right, clac_tier+1)
            //计算
            push_symbol(stmt, stmt.left.name)
        }
        else 
            op_num_type_push(stmt);
    }

    function myUpdateExpression(stmt)
    {
        if(stmt.operator == '++' || stmt.operator == '--')
            {
                vm_str+=String.fromCharCode(OPCODE.PUSH_VALUE + 32);
                vm_str+=String.fromCharCode(1 + 32);
                var IDX = getIDX(stmt.argument.name)
                push_var(IDX)
                if(stmt.operator == '++')
                {
                    vm_str+=String.fromCharCode(OPCODE.EXPRESSION + 32);
                    vm_str+='+'; 
                }
                else if(stmt.operator == '--')
                {
                    vm_str+=String.fromCharCode(OPCODE.EXPRESSION + 32);
                    vm_str+='-'; 
                }
                mov_var(IDX)

                return IDX
            }
            else
            {
                console.log('unkown')
            }
            return undefined
    }
 
   function getStmt(stmt)
   {
        if(stmt != undefined)
        {
            var l_stmt;
            if(stmt.object != undefined)
                l_stmt = stmt
            else if(stmt.init != undefined && stmt.init.object != undefined)
                l_stmt = stmt.init
            else
                l_stmt = stmt
            
            return l_stmt
        }
        return undefined
   }

    function push_value(type, name, value, stmt)
    {
        if(name == 'undefined')
        {
            var IDX = -99 //负数的下标肯定是undefined
            push_var(IDX)
        }
        else if(type == 'ObjectExpression')
        {
            // var func_name = ''
            // if(stmt.callee.type == 'MemberExpression')
            //     func_name = stmt.callee.object.name + '.' + stmt.callee.property.name
            // else
            //     func_name = stmt.callee.name
                
            // //压函数
            // var IDX = getIDX('func$' + func_name)
            // if(IDX == undefined && stmt.callee.property != undefined)
            //     IDX = getIDX('func$' + stmt.callee.property.name)

            // push_var(IDX) //压入函数对象
            // var mprototype = 'prototype'
            // vm_str+=String.fromCharCode(OPCODE.GET_OBJ + 32);
            // vm_str+=String.fromCharCode(mprototype.length + 32);
            // vm_str+=mprototype;

            // stmt.properties[0].key.name == 'success'
        }
        else if(type == 'Literal')
        {
            vm_str+=String.fromCharCode(OPCODE.PUSH_VALUE + 32);
            vm_str+=String.fromCharCode(OPCODE.PUSH_VALUE + stmt.value);
        }
        else if(type == 'Identifier')
        {
            var IDX = getIDX(name) 
            push_var(IDX)
        }
        else if(type == 'UpdateExpression')
        {
            var IDX = myUpdateExpression(stmt);
            push_var(IDX)
        }
        else if(type == 'AssignmentExpression')
        {
            myExpression(stmt);
        }
        else if(type == 'UnaryExpression')
        {
            op_num_type_push(stmt.argument)
            push_symbol(stmt)
        }
        else if(type == 'ThisExpression')
        {
            vm_str+=String.fromCharCode(OPCODE.PUSH_THIS + 32);
        }
        else if(type == 'ArrayExpression')
        {
             for(var j = 0; j < stmt.elements.length; j++)
             {
                 op_num_type_push(stmt.elements[j]);
             }
             //参数为数组
             vm_str+=String.fromCharCode(OPCODE.PUSH_STACK_ARRAY + 32);
             vm_str+=String.fromCharCode(stmt.elements.length + 32);//参数个数
         }
        else if(type == 'BinaryExpression')
        {
            myExpression(stmt)
        }
        else if(type == 'CallExpression')
        {
            var func_name = ''
            if(stmt.callee.type == 'MemberExpression')
                func_name = stmt.callee.object.name + '.' + stmt.callee.property.name
            else
                func_name = stmt.callee.name
            
            
            var var_name = '$retn$' + func_name
            if(func_retn_count[var_name] == undefined)
                encrypt_code('CallExpression', '', stmt)

            var IDX = getIDX(var_name + func_retn_count[var_name][1])
            func_retn_count[var_name][1]++
            func_retn_count[var_name][0]--
            if(func_retn_count[var_name][0] == 0)
                delete func_retn_count[var_name] //说明返回值已经用完了, 就删除喽
            //func_retn_count.remove(1)
            push_var(IDX)
        }
        else if(type == 'MemberExpression')
        {
            var l_stmt = getStmt(stmt)
            if(l_stmt.object.type == 'ThisExpression' || l_stmt.object.name == 'global')
            {
                push_value('ThisExpression', '','', stmt)
            }
            else
            {
                var IDX = getIDX(l_stmt.object.name)
                push_var(IDX)
            }
            
            if(l_stmt.property.type == 'Identifier')
            {
                var IDX = getIDX(l_stmt.property.name)
                if(IDX == undefined)
                {
                    vm_str+=String.fromCharCode(OPCODE.GET_OBJ + 32);
                    vm_str+=String.fromCharCode(l_stmt.property.name.length + 32);
                    vm_str+=l_stmt.property.name;
                }
                else
                {
                    push_var(IDX)
                    vm_str+=String.fromCharCode(OPCODE.GET_ARY_VALUE + 32);
                }
            }
            else
            {
                op_num_type_push(l_stmt.property, true)
                vm_str+=String.fromCharCode(OPCODE.GET_ARY_VALUE + 32);
            }
        }
        else if(type == 'ArrayExpression')
        {
            //数组声明
            if(stmt.init.elements.length > 1)
            {
                var len = stmt.init.elements.length;
                for(var i = 0; i < len; i++)
                {
                    op_num_type_push(stmt.init.elements[i], true)
                }
                vm_str+=String.fromCharCode(OPCODE.PUSH_STACK_ARRAY + 32);
                vm_str+=String.fromCharCode(len + 32);//参数个数
            }
        }
        else if(type == 'ConditionalExpression_test')
        {
            var my_stmt = stmt.init == undefined ? stmt : stmt.init
            //encrypt_code('IfStatement', "",my_stmt) 
            is_ture(stmt)
            tempIDX[tempIDXCount] = vm_str.length
            tempIDXCount++
        }
        else if(type == 'ConditionalExpression_consequent')
        {
            var my_stmt = stmt.init == undefined ? stmt : stmt.init
            tempIDXCount--
            var len = tempIDX[tempIDXCount]
            op_num_type_push(my_stmt.consequent)
            var diff = vm_str.length - len + 2 //加2 = sikp_block字节码和对应长度
            vm_str = vm_str.substring(0, len) + String.fromCharCode(diff + 32) + vm_str.substring(len, vm_str.length)
            vm_str+=String.fromCharCode(OPCODE.SKIP_BLOCK + 32);//执行op
            tempIDX[tempIDXCount] = vm_str.length
            tempIDXCount++
        }
        else if(type == 'ConditionalExpression_alternate')
        {
            var my_stmt = stmt.init == undefined ? stmt : stmt.init
            tempIDXCount--
            var len = tempIDX[tempIDXCount]
            op_num_type_push(my_stmt.alternate)
            var diff = vm_str.length - len
            vm_str = vm_str.substring(0, len) + String.fromCharCode(diff + 32) + vm_str.substring(len, vm_str.length)
        }
        else if(type == 'LogicalExpression_')
        {
            op_num_type_push(stmt.left)

            if(stmt.operator == '||')//stmt.operator == '||'
                vm_str+=String.fromCharCode(OPCODE.PUSH_NOT_STACK_TOP + 32); //取反因为不成立, 才跳
            
            vm_str+=String.fromCharCode(OPCODE.IS_TURE + 32);
            var len = vm_str.length
            op_num_type_push(stmt.right)
            var diff = vm_str.length - len
            vm_str = vm_str.substring(0, len) + String.fromCharCode(diff + 32) + vm_str.substring(len, vm_str.length)
            
            if(stmt.operator == '||')
                vm_str+=String.fromCharCode(OPCODE.PUSH_NOT_STACK_TOP + 32); //还原回去
        }

    }

    //根据操作数类型处理
    function op_num_type_push(stmt, not_push_substr)
    {
        if(stmt.value != undefined && typeof(stmt.value) == 'string')
        {
            if(!not_push_substr)
            {
                push_substring(stmt.value)
            }
            else
            {
                vm_str+=String.fromCharCode(stmt.value.length + 32);
                vm_str+=stmt.value;
            }
            
        }
        else if(stmt.value != undefined &&  typeof(stmt.value) == 'number')
        {
            if(stmt.value.toString().indexOf('.') > 0)
            {
                vm_str+=String.fromCharCode(OPCODE.PUSH_FLOAT_VALUE + 32); 
                var push_num = stmt.value.toString()
                vm_str+=String.fromCharCode(push_num.length + 32);
                vm_str+=push_num
            }
            else if(stmt.value < 37600 && stmt.value > -37600)
            {
                vm_str+=String.fromCharCode(OPCODE.PUSH_VALUE + 32);
                vm_str+=String.fromCharCode(stmt.value + 32);
            }
            else
            {
                vm_str+=String.fromCharCode(OPCODE.PUSH_NUM + 32); 
                var push_num = stmt.value.toString(36)
                vm_str+=String.fromCharCode(push_num.length + 32);
                vm_str+=push_num
            }
        }
        else if (stmt.name == 'global')
            push_value('ThisExpression', stmt.name, '', stmt)
        else if(stmt.type == 'Identifier')
            push_value('Identifier', stmt.name, '', stmt)
        else
            push_value(stmt.type, stmt.name, '', stmt)
    }
    

    //右值是否没有运算表达式
    function is_single(stmt)
    {
        if(stmt.type == 'Identifier' || stmt.type == 'Literal' || stmt.type == 'MemberExpression')
            return true
        return false
    }


    //是否普通赋值语句
    function is_not_clac(str1, stmt, mode)
    {
        var value = null;
        var dest_name = ''
        
        if(mode == 0)
        {
            if(str1.indexOf(' ') < 0 && str1.indexOf('+') < 0 && str1.indexOf('-') < 0)
            {
                op_num_type_push(stmt.init)
                mov_var(esp)
                my_varIDX['$'+ tier][stmt.id.name] = esp++;
                end()
               return true;
            }
        }
        else if(mode == 1)
        {
            var ary = str1.split(' ')
            //if(ary.length == 3 && ary[1] == '=') //只有'='是防止出现+= -=这种
            if(is_single(stmt.right))
            {
                if(stmt.right.type != 'BinaryExpression')
                {
                    //mov_op(stmt.right, stmt.right.name, stmt.left, false)
                    if(stmt.right.type == 'Identifier')
                    {
                        var IDX =  getIDX(stmt.right.name)
                        push_var(IDX)
                    }
                    else if(stmt.right.type == 'Literal')
                    {
                        op_num_type_push(stmt.right);
                    }
                    else if (stmt.right.type == 'MemberExpression')
                    {
                        push_value('MemberExpression', "","",stmt.right)
                    }

                    set_value(stmt, str1)
                    end()
                    return true;
                }
            }
        }

        return false;
    }

    //Member的类型赋值
    function member_mov(stmt)
    {
       
    
        op_num_type_push(stmt.left.object) //压对象
        
        if(stmt.left.computed == false) 
        {
            //说明是this.xxx 这种访问 
            push_substring(stmt.left.property.name)
        }
        else
            op_num_type_push(stmt.left.property) //压下标
        vm_str+=String.fromCharCode(OPCODE.SET_ARY_VALUE + 32);
    }

    function set_value(stmt, str1)
    {
        try
        {
            if(stmt.operator != undefined && !is_clac_bool(stmt.operator))
            {
                //是否是简略的运算表达式, 如+=,-=,*=
                myExpression(stmt, 0)
            }
            else if(stmt.left.type == 'MemberExpression')
            {
                member_mov(stmt)
            }
            else if(1)
            {
                var IDX = getIDX(stmt.left.name)
                mov_var(IDX)
            }
        }
        catch(err)
        {
            //不是member赋值
            mov_var(esp)
            esp++;

        }
    
    }

    function myExpression_2(type, str1, stmt)
    {
        if(type == 'UpdateExpression')
        {
            myUpdateExpression(stmt);
            return
        }
        else if(type == 'ArrayExpression')
        {
            push_value('ArrayExpression', "", str1, stmt)
            
        }
        else
        {
            myExpression(stmt, 0)
            //赋值操作
        }

    }

    function end()
    {

        var fs = require("fs");
        var vmframe = fs.readFileSync('./vm框架/VmFrame_full.js').toString()
        fs.writeFileSync('./build/vm.js', 'var codestr = \`' + vm_str.replace(/\\/g,"\\\\").replace(/\`/g,"\\\`") + '\`\n\n' + vmframe, {encoding:'utf-8'})

    }

    //加密
    function encrypt_code(op, str1, stmt, )
    {
        var push_num;
        //索引栈检测
        console.log(op)
        if(my_varIDX['$'+ tier] == undefined)
            my_varIDX['$'+ tier] = new Array()

        if(op == 'Expression')
        {
            if(str1 == 'uninit')
            { 
                vm_str+=String.fromCharCode(OPCODE.PUSH0 + 32);
                set_value(stmt, str1)
                end()
                return
            }

            if(is_not_clac(str1, stmt, 0)){return}
            else{myExpression_2(stmt.init.type, str1, stmt.init)}

            mov_var(esp)
            my_varIDX['$'+ tier][stmt.id.name] = esp++;

        }
        else if(op.indexOf('ConditionalExpression') >= 0 || op == 'LogicalExpression_')
        {
            //三目运算 || 逻辑运算
            push_value(op, "","",stmt)
        }
        else if(op == 'BinaryExpression')
        {
            myExpression(stmt, 0)
        }
        else if(op == 'ExpressionStatement' )
        {
            //普通赋值
            // if(str1 == 'p += p1[a - 1]')
            //     console.log(str1)
            if(is_not_clac(str1, stmt, 1)){return};
            
            if(stmt.right.type == 'UpdateExpression')
            {
                myUpdateExpression(stmt.right);
                return
            }

            //myExpression(stmt, 0)

            if(!is_clac_bool(stmt.operator))//+= -= *=这种情况
            {
                myExpression(stmt, 0)
                return
            }
            else
            {
                myExpression(stmt.right, 0)
            }
            
            set_value(stmt)
           // var IDX = getIDX(stmt.left.name)
           //mov_var(IDX)
        }
		else if(op == 'EnBlockStatement')
        {
            tier++; //层数增加
            //console.log("Enter BlockStatement")
        }
        else if(op == 'LvBlockStatement')
        {
            delete my_varIDX['$'+tier]
            tier--;//层数减少
            //console.log("Lvave BlockStatement")
        }
        else if(op == 'generateFunctionParams')
        {
            var argIDX = 0
            //参数全部移动到var里
            var params_len = stmt.params.length - 1;
            esp += stmt.params.length //防止第一次调用, 变量赋值覆盖参数
            for(var i = 0; i < stmt.params.length; i++)
            {
                my_varIDX['$'+ tier][stmt.params[i].name] =   i;
                my_varIDX['$'+ tier][stmt.id.name + '$arg$' + argIDX] = i;
                argIDX++;
            }
        }
        else if(op == 'EnFunctionDeclaration')
        {
            vm_str+=String.fromCharCode(OPCODE.PUSH_FUNC + 32);//执行op
            tempIDX[tempIDXCount] = vm_str.length
            tempIDXCount++
            // if(vm_str.length > 0)
            //     funcIDX -= 1
        }
        else if(op == 'LvFunctionDeclaration')
        {
            tempIDXCount--
            var func_len = vm_str.length - tempIDX[tempIDXCount]

            //var func_len = stringToByte(vm_str).length - tempIDX[tempIDXCount]
            //把函数长度插入
            vm_str = vm_str.substring(0, tempIDX[tempIDXCount]) + String.fromCharCode(func_len + 32) + vm_str.substring(tempIDX[tempIDXCount], vm_str.length)
            
            //console.log(vm_str.length)
            //移动到变量区
            mov_var(esp)
            
            //把函数移动到变量栈
            my_varIDX['$'+ tier]['func$' + str1[3]] = esp;
            esp++;
        }
        else if(op == 'CallExpression')
        {
            var func_name = ''
            if(stmt.callee.type == 'MemberExpression')
                func_name = stmt.callee.object.name + '.' + stmt.callee.property.name
            else
                func_name = stmt.callee.name
                
            //压函数
            var IDX = getIDX('func$' + func_name)
            if(IDX == undefined && stmt.callee.property != undefined)
                IDX = getIDX('func$' + stmt.callee.property.name)



            if(IDX != undefined)
            {
                push_var(IDX)
            }    
            else
            {
                 //系统函数
                 if(stmt.callee.type == 'MemberExpression')
                 {
                     //获取obj
                     push_obj(stmt.callee.object)
                    
                    //获取函数
                    var func_name2 = stmt.callee.property.name
                    vm_str+=String.fromCharCode(OPCODE.GET_OBJ + 32);
                    vm_str+=String.fromCharCode(func_name2.length + 32);
                    vm_str+=func_name2;
                 }
                 else if (stmt.callee.type == 'Identifier')
                 {
                    push_obj(stmt.callee)
                 }
            }
    
            
            if(getIDX('func$' + stmt.callee.name) != undefined)
                vm_str+=String.fromCharCode(OPCODE.PUSH_NULL + 32);
            else if(stmt.callee.type == 'MemberExpression')
                push_obj(stmt.callee.object)  
            else
                vm_str+=String.fromCharCode(OPCODE.PUSH_NULL + 32);         

            for(var i =  0; i < stmt.arguments.length; i++)
            {
                // if(stmt.arguments[i].type == 'ObjectExpression')
                // {
                //     stmt.arguments[i].callee = stmt.callee
                // }
                op_num_type_push(stmt.arguments[i])
            }

            
            //组成数组方便apply调用
            vm_str+=String.fromCharCode(OPCODE.PUSH_STACK_ARRAY + 32);
            vm_str+=String.fromCharCode(stmt.arguments.length + 32);//参数个数
            
            //apply调用
            vm_str+=String.fromCharCode(OPCODE.APPLY + 32);

            //储存函数调用结果, 防止函数嵌套调用取结果
            vm_str+=String.fromCharCode(OPCODE.MY_MOV_VARS + 32);
            vm_str+=String.fromCharCode(esp+32);

            //初始化函数返回值计数
            if(func_retn_count['$retn$' + func_name] == undefined)
            {
                func_retn_count['$retn$' + func_name] = new Array()
                func_retn_count['$retn$' + func_name][0] = 0
                func_retn_count['$retn$' + func_name][1] = 0
            }
   
            var var_name = '$retn$' + func_name
            my_varIDX['$'+ tier][var_name + func_retn_count['$retn$' + func_name][0]] = esp++;
            func_retn_count[var_name][0]++
        }
        else if(op == 'EnmaybeBlock' || op == 'IfStatement_ELSEBEGIN')
        {
            if(op == 'IfStatement_ELSEBEGIN')
            {
                //vm_str+=String.fromCharCode(OPCODE.PUSH_NOT_STACK_TOP + 32);
                vm_str+=String.fromCharCode(OPCODE.SKIP_BLOCK + 32);
            }
            tempIDX[tempIDXCount] = vm_str.length
            tempIDXCount++
        }
        else if(op == 'LvmaybeBlock'|| op == 'IfStatement_ELSEEND')
        {
            tempIDXCount--
            var code_len = vm_str.length - tempIDX[tempIDXCount]
            if(str1 == 'IFBLOCK' || str1 == 'IFESBLOCK')
                code_len+=2 //增加ELSE的sikp长度

            vm_str = vm_str.substring(0, tempIDX[tempIDXCount]) + String.fromCharCode(code_len + 32) + vm_str.substring(tempIDX[tempIDXCount], vm_str.length)
            
            //对应ESLE IF的逻辑, 记录索引, 直接跳到ELSE
            if(str1 == 'IFESBLOCK')
            {
                vm_str+=String.fromCharCode(OPCODE.SKIP_BLOCK + 32);
                ifESIDX[ifESIDXCount] = vm_str.length
                ifESIDXCount++
            }
            else if(op == 'IfStatement_ELSEEND')
            {
                //对应ESLE IF的逻辑, 记录索引, 直接跳到ELSE
                for(var i = ifESIDX.length - 1; i >= 0; i--)
                {
                    var code_len = vm_str.length - ifESIDX[i]
                    vm_str = vm_str.substring(0, ifESIDX[i]) + String.fromCharCode(code_len + 32) + vm_str.substring(ifESIDX[i], vm_str.length)
                }

                for(var i = ifESIDX.length - 1; i >= 0; i--)
                {
                    delete ifESIDX[i]
                }
                ifESIDXCount = 0
                ifESIDX.length = 0
            }
        }
        else if(op == 'IfStatement')
        {
           //计算条件
           is_ture(stmt)

        }
        else if(op == 'EnForStatement')
        {
            tempIDX[tempIDXCount] = vm_str.length
            tempIDXCount++
        }
        else if(op == 'LvForStatement')
        {
            
            tempIDXCount--
            var code_len = vm_str.length - tempIDX[tempIDXCount]

            if(str1 == '1')
            {
                code_len = -(code_len + 2) //需跳回, 所以取负数, +2是最后下面sikp_block字节码长度
                vm_str += String.fromCharCode(OPCODE.SKIP_BLOCK + 32);
                vm_str += String.fromCharCode(code_len + 32);
            }
            else if(str1 == '2')
            {
                code_len += 2                  //+2是最后下面sikp_block字节码长度
                vm_str = vm_str.substring(0, tempIDX[tempIDXCount]) + String.fromCharCode(code_len + 32) + vm_str.substring(tempIDX[tempIDXCount], vm_str.length)
            }
        }
        else if(op == 'ForStatement_test')
        {
            myExpression(stmt, 0)
            vm_str+=String.fromCharCode(OPCODE.IS_TURE + 32);
        }
        else if(op == 'ForStatement_update')
        {
            if(stmt.type == 'UpdateExpression')
            {
                myUpdateExpression(stmt)
            }
            else
            {
                myExpression(stmt, 0)
            }
        }
        else if(op == 'ReturnStatement')
        {
            if(stmt.argument.type == 'Identifier')
                push_value('Identifier', stmt.argument.name, '')
            else
                op_num_type_push(stmt.argument)
            vm_str+=String.fromCharCode(OPCODE.RETURN + 32);//执行op
        }
        end()
        return ""
    }
    function is_ture(stmt)
    {
        myExpression(stmt.test, 0)
        vm_str+=String.fromCharCode(OPCODE.IS_TURE + 32);
    }

    function push_substring(str)
    {
        vm_str+=String.fromCharCode(OPCODE.XOR_DECODE + 32);
        var y = str
        var d = []
        for (var g = 0; g < y.length; g++)
            d[g] = y.charCodeAt(g) ^ g + y.length;

        vm_str+=String.fromCharCode(str.length + 32);
        vm_str+=String.fromCharCode.apply(null, d);
        // vm_str+=String.fromCharCode(OPCODE.PUSH_SUBSTR + 32);
        // vm_str+=String.fromCharCode(str.length + 32);
        // vm_str+=str;
    }

    function mov_var(idx)
    {
        vm_str+=String.fromCharCode(OPCODE.MOV_VARS + 32);
        vm_str+=String.fromCharCode(idx+32);
    }
    function push_var(idx)
    {
        vm_str+=String.fromCharCode(OPCODE.PUSH_VAR + 32);
        vm_str+=String.fromCharCode(idx+32);
    }

    //是否判断bool的简单运算符
    function is_clac_bool(op_symbol)
    {
        if(op_symbol.length != 2 || op_symbol.indexOf('=') < 0){ return true}
        if(op_symbol === '==' || op_symbol === '>=' || op_symbol === '<=' || op_symbol === '!=') { return true }
        return false
    }
	
	//******************************添加的编译代码 结束**********************************


    // Generation is done by generateExpression.
    function isExpression(node) {
        return CodeGenerator.Expression.hasOwnProperty(node.type);
    }

    // Generation is done by generateStatement.
    function isStatement(node) {
        return CodeGenerator.Statement.hasOwnProperty(node.type);
    }

    Precedence = {
        Sequence: 0,
        Yield: 1,
        Await: 1,
        Assignment: 1,
        Conditional: 2,
        ArrowFunction: 2,
        LogicalOR: 3,
        LogicalAND: 4,
        BitwiseOR: 5,
        BitwiseXOR: 6,
        BitwiseAND: 7,
        Equality: 8,
        Relational: 9,
        BitwiseSHIFT: 10,
        Additive: 11,
        Multiplicative: 12,
        Unary: 13,
        Postfix: 14,
        Call: 15,
        New: 16,
        TaggedTemplate: 17,
        Member: 18,
        Primary: 19
    };

    BinaryPrecedence = {
        '||': Precedence.LogicalOR,
        '&&': Precedence.LogicalAND,
        '|': Precedence.BitwiseOR,
        '^': Precedence.BitwiseXOR,
        '&': Precedence.BitwiseAND,
        '==': Precedence.Equality,
        '!=': Precedence.Equality,
        '===': Precedence.Equality,
        '!==': Precedence.Equality,
        'is': Precedence.Equality,
        'isnt': Precedence.Equality,
        '<': Precedence.Relational,
        '>': Precedence.Relational,
        '<=': Precedence.Relational,
        '>=': Precedence.Relational,
        'in': Precedence.Relational,
        'instanceof': Precedence.Relational,
        '<<': Precedence.BitwiseSHIFT,
        '>>': Precedence.BitwiseSHIFT,
        '>>>': Precedence.BitwiseSHIFT,
        '+': Precedence.Additive,
        '-': Precedence.Additive,
        '*': Precedence.Multiplicative,
        '%': Precedence.Multiplicative,
        '/': Precedence.Multiplicative
    };

    //Flags
    var F_ALLOW_IN = 1,
        F_ALLOW_CALL = 1 << 1,
        F_ALLOW_UNPARATH_NEW = 1 << 2,
        F_FUNC_BODY = 1 << 3,
        F_DIRECTIVE_CTX = 1 << 4,
        F_SEMICOLON_OPT = 1 << 5;

    //Expression flag sets
    //NOTE: Flag order:
    // F_ALLOW_IN
    // F_ALLOW_CALL
    // F_ALLOW_UNPARATH_NEW
    var E_FTT = F_ALLOW_CALL | F_ALLOW_UNPARATH_NEW,
        E_TTF = F_ALLOW_IN | F_ALLOW_CALL,
        E_TTT = F_ALLOW_IN | F_ALLOW_CALL | F_ALLOW_UNPARATH_NEW,
        E_TFF = F_ALLOW_IN,
        E_FFT = F_ALLOW_UNPARATH_NEW,
        E_TFT = F_ALLOW_IN | F_ALLOW_UNPARATH_NEW;

    //Statement flag sets
    //NOTE: Flag order:
    // F_ALLOW_IN
    // F_FUNC_BODY
    // F_DIRECTIVE_CTX
    // F_SEMICOLON_OPT
    var S_TFFF = F_ALLOW_IN,
        S_TFFT = F_ALLOW_IN | F_SEMICOLON_OPT,
        S_FFFF = 0x00,
        S_TFTF = F_ALLOW_IN | F_DIRECTIVE_CTX,
        S_TTFF = F_ALLOW_IN | F_FUNC_BODY;

    function getDefaultOptions() {
        // default options
        return {
            indent: null,
            base: null,
            parse: null,
            comment: false,
            format: {
                indent: {
                    style: '    ',
                    base: 0,
                    adjustMultilineComment: false
                },
                newline: '\n',
                space: ' ',
                json: false,
                renumber: false,
                hexadecimal: false,
                quotes: 'single',
                escapeless: false,
                compact: false,
                parentheses: true,
                semicolons: true,
                safeConcatenation: false,
                preserveBlankLines: false
            },
            moz: {
                comprehensionExpressionStartsWithAssignment: false,
                starlessGenerator: false
            },
            sourceMap: null,
            sourceMapRoot: null,
            sourceMapWithCode: false,
            directive: false,
            raw: true,
            verbatim: null,
            sourceCode: null
        };
    }

    function stringRepeat(str, num) {
        var result = '';

        for (num |= 0; num > 0; num >>>= 1, str += str) {
            if (num & 1) {
                result += str;
            }
        }

        return result;
    }

    function hasLineTerminator(str) {
        return (/[\r\n]/g).test(str);
    }

    function endsWithLineTerminator(str) {
        var len = str.length;
        return len && esutils.code.isLineTerminator(str.charCodeAt(len - 1));
    }

    function merge(target, override) {
        var key;
        for (key in override) {
            if (override.hasOwnProperty(key)) {
                target[key] = override[key];
            }
        }
        return target;
    }

    function updateDeeply(target, override) {
        var key, val;

        function isHashObject(target) {
            return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
        }

        for (key in override) {
            if (override.hasOwnProperty(key)) {
                val = override[key];
                if (isHashObject(val)) {
                    if (isHashObject(target[key])) {
                        updateDeeply(target[key], val);
                    } else {
                        target[key] = updateDeeply({}, val);
                    }
                } else {
                    target[key] = val;
                }
            }
        }
        return target;
    }

    function generateNumber(value) {
        var result, point, temp, exponent, pos;

        if (value !== value) {
            throw new Error('Numeric literal whose value is NaN');
        }
        if (value < 0 || (value === 0 && 1 / value < 0)) {
            throw new Error('Numeric literal whose value is negative');
        }

        if (value === 1 / 0) {
            return json ? 'null' : renumber ? '1e400' : '1e+400';
        }

        result = '' + value;
        if (!renumber || result.length < 3) {
            return result;
        }

        point = result.indexOf('.');
        if (!json && result.charCodeAt(0) === 0x30  /* 0 */ && point === 1) {
            point = 0;
            result = result.slice(1);
        }
        temp = result;
        result = result.replace('e+', 'e');
        exponent = 0;
        if ((pos = temp.indexOf('e')) > 0) {
            exponent = +temp.slice(pos + 1);
            temp = temp.slice(0, pos);
        }
        if (point >= 0) {
            exponent -= temp.length - point - 1;
            temp = +(temp.slice(0, point) + temp.slice(point + 1)) + '';
        }
        pos = 0;
        while (temp.charCodeAt(temp.length + pos - 1) === 0x30  /* 0 */) {
            --pos;
        }
        if (pos !== 0) {
            exponent -= pos;
            temp = temp.slice(0, pos);
        }
        if (exponent !== 0) {
            temp += 'e' + exponent;
        }
        if ((temp.length < result.length ||
                    (hexadecimal && value > 1e12 && Math.floor(value) === value && (temp = '0x' + value.toString(16)).length < result.length)) &&
                +temp === value) {
            result = temp;
        }

        return result;
    }

    // Generate valid RegExp expression.
    // This function is based on https://github.com/Constellation/iv Engine

    function escapeRegExpCharacter(ch, previousIsBackslash) {
        // not handling '\' and handling \u2028 or \u2029 to unicode escape sequence
        if ((ch & ~1) === 0x2028) {
            return (previousIsBackslash ? 'u' : '\\u') + ((ch === 0x2028) ? '2028' : '2029');
        } else if (ch === 10 || ch === 13) {  // \n, \r
            return (previousIsBackslash ? '' : '\\') + ((ch === 10) ? 'n' : 'r');
        }
        return String.fromCharCode(ch);
    }

    function generateRegExp(reg) {
        var match, result, flags, i, iz, ch, characterInBrack, previousIsBackslash;

        result = reg.toString();

        if (reg.source) {
            // extract flag from toString result
            match = result.match(/\/([^/]*)$/);
            if (!match) {
                return result;
            }

            flags = match[1];
            result = '';

            characterInBrack = false;
            previousIsBackslash = false;
            for (i = 0, iz = reg.source.length; i < iz; ++i) {
                ch = reg.source.charCodeAt(i);

                if (!previousIsBackslash) {
                    if (characterInBrack) {
                        if (ch === 93) {  // ]
                            characterInBrack = false;
                        }
                    } else {
                        if (ch === 47) {  // /
                            result += '\\';
                        } else if (ch === 91) {  // [
                            characterInBrack = true;
                        }
                    }
                    result += escapeRegExpCharacter(ch, previousIsBackslash);
                    previousIsBackslash = ch === 92;  // \
                } else {
                    // if new RegExp("\\\n') is provided, create /\n/
                    result += escapeRegExpCharacter(ch, previousIsBackslash);
                    // prevent like /\\[/]/
                    previousIsBackslash = false;
                }
            }

            return '/' + result + '/' + flags;
        }

        return result;
    }

    function escapeAllowedCharacter(code, next) {
        var hex;

        if (code === 0x08  /* \b */) {
            return '\\b';
        }

        if (code === 0x0C  /* \f */) {
            return '\\f';
        }

        if (code === 0x09  /* \t */) {
            return '\\t';
        }

        hex = code.toString(16).toUpperCase();
        if (json || code > 0xFF) {
            return '\\u' + '0000'.slice(hex.length) + hex;
        } else if (code === 0x0000 && !esutils.code.isDecimalDigit(next)) {
            return '\\0';
        } else if (code === 0x000B  /* \v */) { // '\v'
            return '\\x0B';
        } else {
            return '\\x' + '00'.slice(hex.length) + hex;
        }
    }

    function escapeDisallowedCharacter(code) {
        if (code === 0x5C  /* \ */) {
            return '\\\\';
        }

        if (code === 0x0A  /* \n */) {
            return '\\n';
        }

        if (code === 0x0D  /* \r */) {
            return '\\r';
        }

        if (code === 0x2028) {
            return '\\u2028';
        }

        if (code === 0x2029) {
            return '\\u2029';
        }

        throw new Error('Incorrectly classified character');
    }

    function escapeDirective(str) {
        var i, iz, code, quote;

        quote = quotes === 'double' ? '"' : '\'';
        for (i = 0, iz = str.length; i < iz; ++i) {
            code = str.charCodeAt(i);
            if (code === 0x27  /* ' */) {
                quote = '"';
                break;
            } else if (code === 0x22  /* " */) {
                quote = '\'';
                break;
            } else if (code === 0x5C  /* \ */) {
                ++i;
            }
        }

        return quote + str + quote;
    }

    function escapeString(str) {
        var result = '', i, len, code, singleQuotes = 0, doubleQuotes = 0, single, quote;

        for (i = 0, len = str.length; i < len; ++i) {
            code = str.charCodeAt(i);
            if (code === 0x27  /* ' */) {
                ++singleQuotes;
            } else if (code === 0x22  /* " */) {
                ++doubleQuotes;
            } else if (code === 0x2F  /* / */ && json) {
                result += '\\';
            } else if (esutils.code.isLineTerminator(code) || code === 0x5C  /* \ */) {
                result += escapeDisallowedCharacter(code);
                continue;
            } else if (!esutils.code.isIdentifierPartES5(code) && (json && code < 0x20  /* SP */ || !json && !escapeless && (code < 0x20  /* SP */ || code > 0x7E  /* ~ */))) {
                result += escapeAllowedCharacter(code, str.charCodeAt(i + 1));
                continue;
            }
            result += String.fromCharCode(code);
        }

        single = !(quotes === 'double' || (quotes === 'auto' && doubleQuotes < singleQuotes));
        quote = single ? '\'' : '"';

        if (!(single ? singleQuotes : doubleQuotes)) {
            return quote + result + quote;
        }

        str = result;
        result = quote;

        for (i = 0, len = str.length; i < len; ++i) {
            code = str.charCodeAt(i);
            if ((code === 0x27  /* ' */ && single) || (code === 0x22  /* " */ && !single)) {
                result += '\\';
            }
            result += String.fromCharCode(code);
        }

        return result + quote;
    }

    /**
     * flatten an array to a string, where the array can contain
     * either strings or nested arrays
     */
    function flattenToString(arr) {
        var i, iz, elem, result = '';
        for (i = 0, iz = arr.length; i < iz; ++i) {
            elem = arr[i];
            result += Array.isArray(elem) ? flattenToString(elem) : elem;
        }
        return result;
    }

    /**
     * convert generated to a SourceNode when source maps are enabled.
     */
    function toSourceNodeWhenNeeded(generated, node) {
        if (!sourceMap) {
            // with no source maps, generated is either an
            // array or a string.  if an array, flatten it.
            // if a string, just return it
            if (Array.isArray(generated)) {
                return flattenToString(generated);
            } else {
                return generated;
            }
        }
        if (node == null) {
            if (generated instanceof SourceNode) {
                return generated;
            } else {
                node = {};
            }
        }
        if (node.loc == null) {
            return new SourceNode(null, null, sourceMap, generated, node.name || null);
        }
        return new SourceNode(node.loc.start.line, node.loc.start.column, (sourceMap === true ? node.loc.source || null : sourceMap), generated, node.name || null);
    }

    function noEmptySpace() {
        return (space) ? space : ' ';
    }

    function join(left, right) {
        var leftSource,
            rightSource,
            leftCharCode,
            rightCharCode;

        leftSource = toSourceNodeWhenNeeded(left).toString();
        if (leftSource.length === 0) {
            return [right];
        }

        rightSource = toSourceNodeWhenNeeded(right).toString();
        if (rightSource.length === 0) {
            return [left];
        }

        leftCharCode = leftSource.charCodeAt(leftSource.length - 1);
        rightCharCode = rightSource.charCodeAt(0);

        if ((leftCharCode === 0x2B  /* + */ || leftCharCode === 0x2D  /* - */) && leftCharCode === rightCharCode ||
            esutils.code.isIdentifierPartES5(leftCharCode) && esutils.code.isIdentifierPartES5(rightCharCode) ||
            leftCharCode === 0x2F  /* / */ && rightCharCode === 0x69  /* i */) { // infix word operators all start with `i`
            return [left, noEmptySpace(), right];
        } else if (esutils.code.isWhiteSpace(leftCharCode) || esutils.code.isLineTerminator(leftCharCode) ||
                esutils.code.isWhiteSpace(rightCharCode) || esutils.code.isLineTerminator(rightCharCode)) {
            return [left, right];
        }
        return [left, space, right];
    }

    function addIndent(stmt) {
        return [base, stmt];
    }

    function withIndent(fn) {
        var previousBase;
        previousBase = base;
        base += indent;
        fn(base);
        base = previousBase;
    }

    function calculateSpaces(str) {
        var i;
        for (i = str.length - 1; i >= 0; --i) {
            if (esutils.code.isLineTerminator(str.charCodeAt(i))) {
                break;
            }
        }
        return (str.length - 1) - i;
    }

    function adjustMultilineComment(value, specialBase) {
        var array, i, len, line, j, spaces, previousBase, sn;

        array = value.split(/\r\n|[\r\n]/);
        spaces = Number.MAX_VALUE;

        // first line doesn't have indentation
        for (i = 1, len = array.length; i < len; ++i) {
            line = array[i];
            j = 0;
            while (j < line.length && esutils.code.isWhiteSpace(line.charCodeAt(j))) {
                ++j;
            }
            if (spaces > j) {
                spaces = j;
            }
        }

        if (typeof specialBase !== 'undefined') {
            // pattern like
            // {
            //   var t = 20;  /*
            //                 * this is comment
            //                 */
            // }
            previousBase = base;
            if (array[1][spaces] === '*') {
                specialBase += ' ';
            }
            base = specialBase;
        } else {
            if (spaces & 1) {
                // /*
                //  *
                //  */
                // If spaces are odd number, above pattern is considered.
                // We waste 1 space.
                --spaces;
            }
            previousBase = base;
        }

        for (i = 1, len = array.length; i < len; ++i) {
            sn = toSourceNodeWhenNeeded(addIndent(array[i].slice(spaces)));
            array[i] = sourceMap ? sn.join('') : sn;
        }

        base = previousBase;

        return array.join('\n');
    }

    function generateComment(comment, specialBase) {
        if (comment.type === 'Line') {
            if (endsWithLineTerminator(comment.value)) {
                return '//' + comment.value;
            } else {
                // Always use LineTerminator
                var result = '//' + comment.value;
                if (!preserveBlankLines) {
                    result += '\n';
                }
                return result;
            }
        }
        if (extra.format.indent.adjustMultilineComment && /[\n\r]/.test(comment.value)) {
            return adjustMultilineComment('/*' + comment.value + '*/', specialBase);
        }
        return '/*' + comment.value + '*/';
    }

    function addComments(stmt, result) {
        var i, len, comment, save, tailingToStatement, specialBase, fragment,
            extRange, range, prevRange, prefix, infix, suffix, count;

        if (stmt.leadingComments && stmt.leadingComments.length > 0) {
            save = result;

            if (preserveBlankLines) {
                comment = stmt.leadingComments[0];
                result = [];

                extRange = comment.extendedRange;
                range = comment.range;

                prefix = sourceCode.substring(extRange[0], range[0]);
                count = (prefix.match(/\n/g) || []).length;
                if (count > 0) {
                    result.push(stringRepeat('\n', count));
                    result.push(addIndent(generateComment(comment)));
                } else {
                    result.push(prefix);
                    result.push(generateComment(comment));
                }

                prevRange = range;

                for (i = 1, len = stmt.leadingComments.length; i < len; i++) {
                    comment = stmt.leadingComments[i];
                    range = comment.range;

                    infix = sourceCode.substring(prevRange[1], range[0]);
                    count = (infix.match(/\n/g) || []).length;
                    result.push(stringRepeat('\n', count));
                    result.push(addIndent(generateComment(comment)));

                    prevRange = range;
                }

                suffix = sourceCode.substring(range[1], extRange[1]);
                count = (suffix.match(/\n/g) || []).length;
                result.push(stringRepeat('\n', count));
            } else {
                comment = stmt.leadingComments[0];
                result = [];
                if (safeConcatenation && stmt.type === Syntax.Program && stmt.body.length === 0) {
                    result.push('\n');
                }
                result.push(generateComment(comment));
                if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                    result.push('\n');
                }

                for (i = 1, len = stmt.leadingComments.length; i < len; ++i) {
                    comment = stmt.leadingComments[i];
                    fragment = [generateComment(comment)];
                    if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                        fragment.push('\n');
                    }
                    result.push(addIndent(fragment));
                }
            }

            result.push(addIndent(save));
        }

        if (stmt.trailingComments) {

            if (preserveBlankLines) {
                comment = stmt.trailingComments[0];
                extRange = comment.extendedRange;
                range = comment.range;

                prefix = sourceCode.substring(extRange[0], range[0]);
                count = (prefix.match(/\n/g) || []).length;

                if (count > 0) {
                    result.push(stringRepeat('\n', count));
                    result.push(addIndent(generateComment(comment)));
                } else {
                    result.push(prefix);
                    result.push(generateComment(comment));
                }
            } else {
                tailingToStatement = !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
                specialBase = stringRepeat(' ', calculateSpaces(toSourceNodeWhenNeeded([base, result, indent]).toString()));
                for (i = 0, len = stmt.trailingComments.length; i < len; ++i) {
                    comment = stmt.trailingComments[i];
                    if (tailingToStatement) {
                        // We assume target like following script
                        //
                        // var t = 20;  /**
                        //               * This is comment of t
                        //               */
                        if (i === 0) {
                            // first case
                            result = [result, indent];
                        } else {
                            result = [result, specialBase];
                        }
                        result.push(generateComment(comment, specialBase));
                    } else {
                        result = [result, addIndent(generateComment(comment))];
                    }
                    if (i !== len - 1 && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                        result = [result, '\n'];
                    }
                }
            }
        }

        return result;
    }

    function generateBlankLines(start, end, result) {
        var j, newlineCount = 0;

        for (j = start; j < end; j++) {
            if (sourceCode[j] === '\n') {
                newlineCount++;
            }
        }

        for (j = 1; j < newlineCount; j++) {
            result.push(newline);
        }
    }

    function parenthesize(text, current, should) {
        if (current < should) {
            return ['(', text, ')'];
        }
        return text;
    }

    function generateVerbatimString(string) {
        var i, iz, result;
        result = string.split(/\r\n|\n/);
        for (i = 1, iz = result.length; i < iz; i++) {
            result[i] = newline + base + result[i];
        }
        return result;
    }

    function generateVerbatim(expr, precedence) {
        var verbatim, result, prec;
        verbatim = expr[extra.verbatim];

        if (typeof verbatim === 'string') {
            result = parenthesize(generateVerbatimString(verbatim), Precedence.Sequence, precedence);
        } else {
            // verbatim is object
            result = generateVerbatimString(verbatim.content);
            prec = (verbatim.precedence != null) ? verbatim.precedence : Precedence.Sequence;
            result = parenthesize(result, prec, precedence);
        }

        return toSourceNodeWhenNeeded(result, expr);
    }

    function CodeGenerator() {
    }

    // Helpers.

    CodeGenerator.prototype.maybeBlock = function(stmt, flags, my_arg) {
        var result, noLeadingComment, that = this;

        if(my_arg && stmt.type == 'BlockStatement')
            encrypt_code('EnmaybeBlock', my_arg, stmt)
        noLeadingComment = !extra.comment || !stmt.leadingComments;

        if (stmt.type === Syntax.BlockStatement && noLeadingComment) {
            var reutn_v = [space, this.generateStatement(stmt, flags)]
            if(my_arg && stmt.type == 'BlockStatement')
                encrypt_code('LvmaybeBlock', my_arg, stmt)
            return reutn_v;
        }

        if (stmt.type === Syntax.EmptyStatement && noLeadingComment) {
            if(my_arg && stmt.type == 'BlockStatement')
                encrypt_code('LvmaybeBlock', my_arg, stmt)
            return ';';
        }

        withIndent(function () {
            result = [
                newline,
                addIndent(that.generateStatement(stmt, flags))
            ];
        });

        // if(isInsertLen == true)
        //     encrypt_code('LvmaybeBlock', '', stmt)

        return result;
    };

    CodeGenerator.prototype.maybeBlockSuffix = function (stmt, result) {
        var ends = endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
        if (stmt.type === Syntax.BlockStatement && (!extra.comment || !stmt.leadingComments) && !ends) {
            return [result, space];
        }
        if (ends) {
            return [result, base];
        }
        return [result, newline, base];
    };

    function generateIdentifier(node) {
        return toSourceNodeWhenNeeded(node.name, node);
    }

    function generateAsyncPrefix(node, spaceRequired) {
        return node.async ? 'async' + (spaceRequired ? noEmptySpace() : space) : '';
    }

    function generateStarSuffix(node) {
        var isGenerator = node.generator && !extra.moz.starlessGenerator;
        return isGenerator ? '*' + space : '';
    }

    function generateMethodPrefix(prop) {
        var func = prop.value, prefix = '';
        if (func.async) {
            prefix += generateAsyncPrefix(func, !prop.computed);
        }
        if (func.generator) {
            // avoid space before method name
            prefix += generateStarSuffix(func) ? '*' : '';
        }
        return prefix;
    }

    CodeGenerator.prototype.generatePattern = function (node, precedence, flags) {
        if (node.type === Syntax.Identifier) {
            return generateIdentifier(node);
        }
        return this.generateExpression(node, precedence, flags);
    };

    CodeGenerator.prototype.generateFunctionParams = function (node) {
        var i, iz, result, hasDefault;

        hasDefault = false;

        if (node.type === Syntax.ArrowFunctionExpression &&
                !node.rest && (!node.defaults || node.defaults.length === 0) &&
                node.params.length === 1 && node.params[0].type === Syntax.Identifier) {
            // arg => { } case
            result = [generateAsyncPrefix(node, true), generateIdentifier(node.params[0])];
        } else {
            result = node.type === Syntax.ArrowFunctionExpression ? [generateAsyncPrefix(node, false)] : [];
            result.push('(');
            if (node.defaults) {
                hasDefault = true;
            }
            for (i = 0, iz = node.params.length; i < iz; ++i) {
                if (hasDefault && node.defaults[i]) {
                    // Handle default values.
                    result.push(this.generateAssignment(node.params[i], node.defaults[i], '=', Precedence.Assignment, E_TTT));
                } else {
                    result.push(this.generatePattern(node.params[i], Precedence.Assignment, E_TTT));
                }
                if (i + 1 < iz) {
                    result.push(',' + space);
                }
            }

            if (node.rest) {
                if (node.params.length) {
                    result.push(',' + space);
                }
                result.push('...');
                result.push(generateIdentifier(node.rest));
            }

            
            result.push(')');
            encrypt_code('generateFunctionParams', result, node)
        }

        return result;
    };

    CodeGenerator.prototype.generateFunctionBody = function (node) {
        var result, expr;

        result = this.generateFunctionParams(node);

        if (node.type === Syntax.ArrowFunctionExpression) {
            result.push(space);
            result.push('=>');
        }

        if (node.expression) {
            result.push(space);
            expr = this.generateExpression(node.body, Precedence.Assignment, E_TTT);
            if (expr.toString().charAt(0) === '{') {
                expr = ['(', expr, ')'];
            }
            result.push(expr);
        } else {
            result.push(this.maybeBlock(node.body, S_TTFF));
        }

        return result;
    };

    CodeGenerator.prototype.generateIterationForStatement = function (operator, stmt, flags) {
        var result = ['for' + space + (stmt.await ? 'await' + space : '') + '('], that = this;
        withIndent(function () {
            if (stmt.left.type === Syntax.VariableDeclaration) {
                withIndent(function () {
                    result.push(stmt.left.kind + noEmptySpace());
                    result.push(that.generateStatement(stmt.left.declarations[0], S_FFFF));
                });
            } else {
                result.push(that.generateExpression(stmt.left, Precedence.Call, E_TTT));
            }

            result = join(result, operator);
            result = [join(
                result,
                that.generateExpression(stmt.right, Precedence.Sequence, E_TTT)
            ), ')'];
        });
        result.push(this.maybeBlock(stmt.body, flags));
        return result;
    };

    CodeGenerator.prototype.generatePropertyKey = function (expr, computed) {
        var result = [];

        if (computed) {
            result.push('[');
        }

        result.push(this.generateExpression(expr, Precedence.Sequence, E_TTT));

        if (computed) {
            result.push(']');
        }

        return result;
    };

    CodeGenerator.prototype.generateAssignment = function (left, right, operator, precedence, flags) {
        if (Precedence.Assignment < precedence) {
            flags |= F_ALLOW_IN;
        }

        return parenthesize(
            [
                this.generateExpression(left, Precedence.Call, flags),
                space + operator + space,
                this.generateExpression(right, Precedence.Assignment, flags)
            ],
            Precedence.Assignment,
            precedence
        );
    };

    CodeGenerator.prototype.semicolon = function (flags) {
        if (!semicolons && flags & F_SEMICOLON_OPT) {
            return '';
        }
        return ';';
    };

    // Statements.

    CodeGenerator.Statement = {

        BlockStatement: function (stmt, flags) {
            var range, content, result = ['{', newline], that = this;
            encrypt_code('EnBlockStatement', '')
            withIndent(function () {
                // handle functions without any code
                if (stmt.body.length === 0 && preserveBlankLines) {
                    range = stmt.range;
                    if (range[1] - range[0] > 2) {
                        content = sourceCode.substring(range[0] + 1, range[1] - 1);
                        if (content[0] === '\n') {
                            result = ['{'];
                        }
                        result.push(content);
                    }
                }

                var i, iz, fragment, bodyFlags;
                bodyFlags = S_TFFF;
                if (flags & F_FUNC_BODY) {
                    bodyFlags |= F_DIRECTIVE_CTX;
                }

                for (i = 0, iz = stmt.body.length; i < iz; ++i) {
                    if (preserveBlankLines) {
                        // handle spaces before the first line
                        if (i === 0) {
                            if (stmt.body[0].leadingComments) {
                                range = stmt.body[0].leadingComments[0].extendedRange;
                                content = sourceCode.substring(range[0], range[1]);
                                if (content[0] === '\n') {
                                    result = ['{'];
                                }
                            }
                            if (!stmt.body[0].leadingComments) {
                                generateBlankLines(stmt.range[0], stmt.body[0].range[0], result);
                            }
                        }

                        // handle spaces between lines
                        if (i > 0) {
                            if (!stmt.body[i - 1].trailingComments  && !stmt.body[i].leadingComments) {
                                generateBlankLines(stmt.body[i - 1].range[1], stmt.body[i].range[0], result);
                            }
                        }
                    }

                    if (i === iz - 1) {
                        bodyFlags |= F_SEMICOLON_OPT;
                    }

                    if (stmt.body[i].leadingComments && preserveBlankLines) {
                        fragment = that.generateStatement(stmt.body[i], bodyFlags);
                    } else {
                        fragment = addIndent(that.generateStatement(stmt.body[i], bodyFlags));
                    }

                    result.push(fragment);
                    if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                        if (preserveBlankLines && i < iz - 1) {
                            // don't add a new line if there are leading coments
                            // in the next statement
                            if (!stmt.body[i + 1].leadingComments) {
                                result.push(newline);
                            }
                        } else {
                            result.push(newline);
                        }
                    }

                    if (preserveBlankLines) {
                        // handle spaces after the last line
                        if (i === iz - 1) {
                            if (!stmt.body[i].trailingComments) {
                                generateBlankLines(stmt.body[i].range[1], stmt.range[1], result);
                            }
                        }
                    }
                }
            });

            encrypt_code('LvBlockStatement', '')
            result.push(addIndent('}'));
            return result;
        },

        BreakStatement: function (stmt, flags) {
            if (stmt.label) {
                return 'break ' + stmt.label.name + this.semicolon(flags);
            }
            return 'break' + this.semicolon(flags);
        },

        ContinueStatement: function (stmt, flags) {
            if (stmt.label) {
                return 'continue ' + stmt.label.name + this.semicolon(flags);
            }
            return 'continue' + this.semicolon(flags);
        },

        ClassBody: function (stmt, flags) {
            var result = [ '{', newline], that = this;

            withIndent(function (indent) {
                var i, iz;

                for (i = 0, iz = stmt.body.length; i < iz; ++i) {
                    result.push(indent);
                    result.push(that.generateExpression(stmt.body[i], Precedence.Sequence, E_TTT));
                    if (i + 1 < iz) {
                        result.push(newline);
                    }
                }
            });

            if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                result.push(newline);
            }
            result.push(base);
            result.push('}');
            return result;
        },

        ClassDeclaration: function (stmt, flags) {
            var result, fragment;
            result  = ['class'];
            if (stmt.id) {
                result = join(result, this.generateExpression(stmt.id, Precedence.Sequence, E_TTT));
            }
            if (stmt.superClass) {
                fragment = join('extends', this.generateExpression(stmt.superClass, Precedence.Assignment, E_TTT));
                result = join(result, fragment);
            }
            result.push(space);
            result.push(this.generateStatement(stmt.body, S_TFFT));
            return result;
        },

        DirectiveStatement: function (stmt, flags) {
            if (extra.raw && stmt.raw) {
                return stmt.raw + this.semicolon(flags);
            }
            return escapeDirective(stmt.directive) + this.semicolon(flags);
        },

        DoWhileStatement: function (stmt, flags) {
            // Because `do 42 while (cond)` is Syntax Error. We need semicolon.
            var result = join('do', this.maybeBlock(stmt.body, S_TFFF));
            result = this.maybeBlockSuffix(stmt.body, result);
            return join(result, [
                'while' + space + '(',
                this.generateExpression(stmt.test, Precedence.Sequence, E_TTT),
                ')' + this.semicolon(flags)
            ]);
        },

        CatchClause: function (stmt, flags) {
            var result, that = this;
            withIndent(function () {
                var guard;

                result = [
                    'catch' + space + '(',
                    that.generateExpression(stmt.param, Precedence.Sequence, E_TTT),
                    ')'
                ];

                if (stmt.guard) {
                    guard = that.generateExpression(stmt.guard, Precedence.Sequence, E_TTT);
                    result.splice(2, 0, ' if ', guard);
                }
            });
            result.push(this.maybeBlock(stmt.body, S_TFFF));
            return result;
        },

        DebuggerStatement: function (stmt, flags) {
            return 'debugger' + this.semicolon(flags);
        },

        EmptyStatement: function (stmt, flags) {
            return ';';
        },

        ExportDefaultDeclaration: function (stmt, flags) {
            var result = [ 'export' ], bodyFlags;

            bodyFlags = (flags & F_SEMICOLON_OPT) ? S_TFFT : S_TFFF;

            // export default HoistableDeclaration[Default]
            // export default AssignmentExpression[In] ;
            result = join(result, 'default');
            if (isStatement(stmt.declaration)) {
                result = join(result, this.generateStatement(stmt.declaration, bodyFlags));
            } else {
                result = join(result, this.generateExpression(stmt.declaration, Precedence.Assignment, E_TTT) + this.semicolon(flags));
            }
            return result;
        },

        ExportNamedDeclaration: function (stmt, flags) {
            var result = [ 'export' ], bodyFlags, that = this;

            bodyFlags = (flags & F_SEMICOLON_OPT) ? S_TFFT : S_TFFF;

            // export VariableStatement
            // export Declaration[Default]
            if (stmt.declaration) {
                return join(result, this.generateStatement(stmt.declaration, bodyFlags));
            }

            // export ExportClause[NoReference] FromClause ;
            // export ExportClause ;
            if (stmt.specifiers) {
                if (stmt.specifiers.length === 0) {
                    result = join(result, '{' + space + '}');
                } else if (stmt.specifiers[0].type === Syntax.ExportBatchSpecifier) {
                    result = join(result, this.generateExpression(stmt.specifiers[0], Precedence.Sequence, E_TTT));
                } else {
                    result = join(result, '{');
                    withIndent(function (indent) {
                        var i, iz;
                        result.push(newline);
                        for (i = 0, iz = stmt.specifiers.length; i < iz; ++i) {
                            result.push(indent);
                            result.push(that.generateExpression(stmt.specifiers[i], Precedence.Sequence, E_TTT));
                            if (i + 1 < iz) {
                                result.push(',' + newline);
                            }
                        }
                    });
                    if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                        result.push(newline);
                    }
                    result.push(base + '}');
                }

                if (stmt.source) {
                    result = join(result, [
                        'from' + space,
                        // ModuleSpecifier
                        this.generateExpression(stmt.source, Precedence.Sequence, E_TTT),
                        this.semicolon(flags)
                    ]);
                } else {
                    result.push(this.semicolon(flags));
                }
            }
            return result;
        },

        ExportAllDeclaration: function (stmt, flags) {
            // export * FromClause ;
            return [
                'export' + space,
                '*' + space,
                'from' + space,
                // ModuleSpecifier
                this.generateExpression(stmt.source, Precedence.Sequence, E_TTT),
                this.semicolon(flags)
            ];
        },

        ExpressionStatement: function (stmt, flags) {
            var result, fragment;

            function isClassPrefixed(fragment) {
                var code;
                if (fragment.slice(0, 5) !== 'class') {
                    return false;
                }
                code = fragment.charCodeAt(5);
                return code === 0x7B  /* '{' */ || esutils.code.isWhiteSpace(code) || esutils.code.isLineTerminator(code);
            }

            function isFunctionPrefixed(fragment) {
                var code;
                if (fragment.slice(0, 8) !== 'function') {
                    return false;
                }
                code = fragment.charCodeAt(8);
                return code === 0x28 /* '(' */ || esutils.code.isWhiteSpace(code) || code === 0x2A  /* '*' */ || esutils.code.isLineTerminator(code);
            }

            function isAsyncPrefixed(fragment) {
                var code, i, iz;
                if (fragment.slice(0, 5) !== 'async') {
                    return false;
                }
                if (!esutils.code.isWhiteSpace(fragment.charCodeAt(5))) {
                    return false;
                }
                for (i = 6, iz = fragment.length; i < iz; ++i) {
                    if (!esutils.code.isWhiteSpace(fragment.charCodeAt(i))) {
                        break;
                    }
                }
                if (i === iz) {
                    return false;
                }
                if (fragment.slice(i, i + 8) !== 'function') {
                    return false;
                }
                code = fragment.charCodeAt(i + 8);
                return code === 0x28 /* '(' */ || esutils.code.isWhiteSpace(code) || code === 0x2A  /* '*' */ || esutils.code.isLineTerminator(code);
            }

            result = [this.generateExpression(stmt.expression, Precedence.Sequence, E_TTT)];
            // 12.4 '{', 'function', 'class' is not allowed in this position.
            // wrap expression with parentheses
            fragment = toSourceNodeWhenNeeded(result).toString();
            if (fragment.charCodeAt(0) === 0x7B  /* '{' */ ||  // ObjectExpression
                    isClassPrefixed(fragment) ||
                    isFunctionPrefixed(fragment) ||
                    isAsyncPrefixed(fragment) ||
                    (directive && (flags & F_DIRECTIVE_CTX) && stmt.expression.type === Syntax.Literal && typeof stmt.expression.value === 'string')) {
                result = ['(', result, ')' + this.semicolon(flags)];
            } else {
                result.push(this.semicolon(flags));
            }

            if(stmt.type  ==  'ExpressionStatement' && stmt.expression.type == 'AssignmentExpression')
                encrypt_code('ExpressionStatement', result[0], stmt.expression)
            return result;
        },

        ImportDeclaration: function (stmt, flags) {
            // ES6: 15.2.1 valid import declarations:
            //     - import ImportClause FromClause ;
            //     - import ModuleSpecifier ;
            var result, cursor, that = this;

            // If no ImportClause is present,
            // this should be `import ModuleSpecifier` so skip `from`
            // ModuleSpecifier is StringLiteral.
            if (stmt.specifiers.length === 0) {
                // import ModuleSpecifier ;
                return [
                    'import',
                    space,
                    // ModuleSpecifier
                    this.generateExpression(stmt.source, Precedence.Sequence, E_TTT),
                    this.semicolon(flags)
                ];
            }

            // import ImportClause FromClause ;
            result = [
                'import'
            ];
            cursor = 0;

            // ImportedBinding
            if (stmt.specifiers[cursor].type === Syntax.ImportDefaultSpecifier) {
                result = join(result, [
                        this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT)
                ]);
                ++cursor;
            }

            if (stmt.specifiers[cursor]) {
                if (cursor !== 0) {
                    result.push(',');
                }

                if (stmt.specifiers[cursor].type === Syntax.ImportNamespaceSpecifier) {
                    // NameSpaceImport
                    result = join(result, [
                            space,
                            this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT)
                    ]);
                } else {
                    // NamedImports
                    result.push(space + '{');

                    if ((stmt.specifiers.length - cursor) === 1) {
                        // import { ... } from "...";
                        result.push(space);
                        result.push(this.generateExpression(stmt.specifiers[cursor], Precedence.Sequence, E_TTT));
                        result.push(space + '}' + space);
                    } else {
                        // import {
                        //    ...,
                        //    ...,
                        // } from "...";
                        withIndent(function (indent) {
                            var i, iz;
                            result.push(newline);
                            for (i = cursor, iz = stmt.specifiers.length; i < iz; ++i) {
                                result.push(indent);
                                result.push(that.generateExpression(stmt.specifiers[i], Precedence.Sequence, E_TTT));
                                if (i + 1 < iz) {
                                    result.push(',' + newline);
                                }
                            }
                        });
                        if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                            result.push(newline);
                        }
                        result.push(base + '}' + space);
                    }
                }
            }

            result = join(result, [
                'from' + space,
                // ModuleSpecifier
                this.generateExpression(stmt.source, Precedence.Sequence, E_TTT),
                this.semicolon(flags)
            ]);
            return result;
        },

        VariableDeclarator: function (stmt, flags) {
            var itemFlags = (flags & F_ALLOW_IN) ? E_TTT : E_FTT;
            if (stmt.init) {
                var a = this.generateExpression(stmt.id, Precedence.Assignment, itemFlags)
                var b = this.generateExpression(stmt.init, Precedence.Assignment, itemFlags)
                //console.log(stmt)
                encrypt_code('Expression', b, stmt)
                return [
                    a,
                    space,
                    '=',
                    space,
                    b
                ];
            }
            else
                encrypt_code('Expression', 'uninit', stmt)
            return this.generatePattern(stmt.id, Precedence.Assignment, itemFlags);
        },

        VariableDeclaration: function (stmt, flags) {
            // VariableDeclarator is typed as Statement,
            // but joined with comma (not LineTerminator).
            // So if comment is attached to target node, we should specialize.
            var result, i, iz, node, bodyFlags, that = this;

            result = [ stmt.kind ];

            bodyFlags = (flags & F_ALLOW_IN) ? S_TFFF : S_FFFF;

            function block() {
                node = stmt.declarations[0];
                if (extra.comment && node.leadingComments) {
                    result.push('\n');
                    result.push(addIndent(that.generateStatement(node, bodyFlags)));
                } else {
                    result.push(noEmptySpace());
                    result.push(that.generateStatement(node, bodyFlags));
                }

                for (i = 1, iz = stmt.declarations.length; i < iz; ++i) {
                    node = stmt.declarations[i];
                    if (extra.comment && node.leadingComments) {
                        result.push(',' + newline);
                        result.push(addIndent(that.generateStatement(node, bodyFlags)));
                    } else {
                        result.push(',' + space);
                        result.push(that.generateStatement(node, bodyFlags));
                    }
                }
            }

            if (stmt.declarations.length > 1) {
                withIndent(block);
            } else {
                block();
            }

            result.push(this.semicolon(flags));

            return result;
        },

        ThrowStatement: function (stmt, flags) {
            return [join(
                'throw',
                this.generateExpression(stmt.argument, Precedence.Sequence, E_TTT)
            ), this.semicolon(flags)];
        },

        TryStatement: function (stmt, flags) {
            var result, i, iz, guardedHandlers;

            result = ['try', this.maybeBlock(stmt.block, S_TFFF)];
            result = this.maybeBlockSuffix(stmt.block, result);

            if (stmt.handlers) {
                // old interface
                for (i = 0, iz = stmt.handlers.length; i < iz; ++i) {
                    result = join(result, this.generateStatement(stmt.handlers[i], S_TFFF));
                    if (stmt.finalizer || i + 1 !== iz) {
                        result = this.maybeBlockSuffix(stmt.handlers[i].body, result);
                    }
                }
            } else {
                guardedHandlers = stmt.guardedHandlers || [];

                for (i = 0, iz = guardedHandlers.length; i < iz; ++i) {
                    result = join(result, this.generateStatement(guardedHandlers[i], S_TFFF));
                    if (stmt.finalizer || i + 1 !== iz) {
                        result = this.maybeBlockSuffix(guardedHandlers[i].body, result);
                    }
                }

                // new interface
                if (stmt.handler) {
                    if (Array.isArray(stmt.handler)) {
                        for (i = 0, iz = stmt.handler.length; i < iz; ++i) {
                            result = join(result, this.generateStatement(stmt.handler[i], S_TFFF));
                            if (stmt.finalizer || i + 1 !== iz) {
                                result = this.maybeBlockSuffix(stmt.handler[i].body, result);
                            }
                        }
                    } else {
                        result = join(result, this.generateStatement(stmt.handler, S_TFFF));
                        if (stmt.finalizer) {
                            result = this.maybeBlockSuffix(stmt.handler.body, result);
                        }
                    }
                }
            }
            if (stmt.finalizer) {
                result = join(result, ['finally', this.maybeBlock(stmt.finalizer, S_TFFF)]);
            }
            return result;
        },

        SwitchStatement: function (stmt, flags) {
            var result, fragment, i, iz, bodyFlags, that = this;
            withIndent(function () {
                result = [
                    'switch' + space + '(',
                    that.generateExpression(stmt.discriminant, Precedence.Sequence, E_TTT),
                    ')' + space + '{' + newline
                ];
            });
            if (stmt.cases) {
                bodyFlags = S_TFFF;
                for (i = 0, iz = stmt.cases.length; i < iz; ++i) {
                    if (i === iz - 1) {
                        bodyFlags |= F_SEMICOLON_OPT;
                    }
                    fragment = addIndent(this.generateStatement(stmt.cases[i], bodyFlags));
                    result.push(fragment);
                    if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                        result.push(newline);
                    }
                }
            }
            result.push(addIndent('}'));
            return result;
        },

        SwitchCase: function (stmt, flags) {
            var result, fragment, i, iz, bodyFlags, that = this;
            withIndent(function () {
                if (stmt.test) {
                    result = [
                        join('case', that.generateExpression(stmt.test, Precedence.Sequence, E_TTT)),
                        ':'
                    ];
                } else {
                    result = ['default:'];
                }

                i = 0;
                iz = stmt.consequent.length;
                if (iz && stmt.consequent[0].type === Syntax.BlockStatement) {
                    fragment = that.maybeBlock(stmt.consequent[0], S_TFFF);
                    result.push(fragment);
                    i = 1;
                }

                if (i !== iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                    result.push(newline);
                }

                bodyFlags = S_TFFF;
                for (; i < iz; ++i) {
                    if (i === iz - 1 && flags & F_SEMICOLON_OPT) {
                        bodyFlags |= F_SEMICOLON_OPT;
                    }
                    fragment = addIndent(that.generateStatement(stmt.consequent[i], bodyFlags));
                    result.push(fragment);
                    if (i + 1 !== iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                        result.push(newline);
                    }
                }
            });
            return result;
        },

        IfStatement: function (stmt, flags) {
            var result, bodyFlags, semicolonOptional, that = this;
            
            withIndent(function () {
                result = [
                    'if' + space + '(',
                    that.generateExpression(stmt.test, Precedence.Sequence, E_TTT),
                    ')'
                ];
            });
            encrypt_code('IfStatement', '', stmt)
            
            semicolonOptional = flags & F_SEMICOLON_OPT;
            bodyFlags = S_TFFF;
            if (semicolonOptional) {
                bodyFlags |= F_SEMICOLON_OPT;
            }
            if (stmt.alternate) {
                if(stmt.alternate.type === Syntax.IfStatement)
                    result.push(this.maybeBlock(stmt.consequent, S_TFFF, 'IFESBLOCK'));
                else
                    result.push(this.maybeBlock(stmt.consequent, S_TFFF, 'IFBLOCK'));

                result = this.maybeBlockSuffix(stmt.consequent, result);
                if (stmt.alternate.type === Syntax.IfStatement) {
                    result = join(result, ['else ', this.generateStatement(stmt.alternate, bodyFlags)]);
                } else {
                    encrypt_code('IfStatement_ELSEBEGIN', '', stmt)
                    result = join(result, join('else', this.maybeBlock(stmt.alternate, bodyFlags)));
                    encrypt_code('IfStatement_ELSEEND', '', stmt)
                }
                
            } else {
                result.push(this.maybeBlock(stmt.consequent, bodyFlags, 'nornml'));//
            }
            return result;
        },

        ForStatement: function (stmt, flags) {
            var temp, result, that = this;
            withIndent(function () {
                result = ['for' + space + '('];
                if (stmt.init) {
                    if (stmt.init.type === Syntax.VariableDeclaration) {
                        result.push(that.generateStatement(stmt.init, S_FFFF));
                    } else {
                        // F_ALLOW_IN becomes false.
                        result.push(that.generateExpression(stmt.init, Precedence.Sequence, E_FTT));
                        result.push(';');
                    }
                } else {
                    result.push(';');
                }

                encrypt_code('EnForStatement', '1', stmt)
                if (stmt.test) {
                    result.push(space);
                    encrypt_code('ForStatement_test', '', stmt.test)
                    encrypt_code('EnForStatement', '2', stmt)
                    result.push(that.generateExpression(stmt.test, Precedence.Sequence, E_TTT));
                    result.push(';');
                } else {
                    result.push(';');
                }
                

                //临时加的, 为了保持执行成顺
                temp = that.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF)

                if (stmt.update) {
                    result.push(space);
                    encrypt_code('ForStatement_update', '', stmt.update)
                    result.push(that.generateExpression(stmt.update, Precedence.Sequence, E_TTT));
                    result.push(')');
                } else {
                    result.push(')');
                }

                encrypt_code('LvForStatement', '2', stmt)//整个循环体+判断长度
                encrypt_code('LvForStatement', '1', stmt)//整个循环体长度
            });

            result.push(temp);

            return result;
        },

        ForInStatement: function (stmt, flags) {
            return this.generateIterationForStatement('in', stmt, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF);
        },

        ForOfStatement: function (stmt, flags) {
            return this.generateIterationForStatement('of', stmt, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF);
        },

        LabeledStatement: function (stmt, flags) {
            return [stmt.label.name + ':', this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF)];
        },

        Program: function (stmt, flags) {
            var result, fragment, i, iz, bodyFlags;
            iz = stmt.body.length;
            result = [safeConcatenation && iz > 0 ? '\n' : ''];
            bodyFlags = S_TFTF;
            for (i = 0; i < iz; ++i) {
                if (!safeConcatenation && i === iz - 1) {
                    bodyFlags |= F_SEMICOLON_OPT;
                }

                if (preserveBlankLines) {
                    // handle spaces before the first line
                    if (i === 0) {
                        if (!stmt.body[0].leadingComments) {
                            generateBlankLines(stmt.range[0], stmt.body[i].range[0], result);
                        }
                    }

                    // handle spaces between lines
                    if (i > 0) {
                        if (!stmt.body[i - 1].trailingComments && !stmt.body[i].leadingComments) {
                            generateBlankLines(stmt.body[i - 1].range[1], stmt.body[i].range[0], result);
                        }
                    }
                }

                fragment = addIndent(this.generateStatement(stmt.body[i], bodyFlags));
                result.push(fragment);
                if (i + 1 < iz && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                    if (preserveBlankLines) {
                        if (!stmt.body[i + 1].leadingComments) {
                            result.push(newline);
                        }
                    } else {
                        result.push(newline);
                    }
                }

                if (preserveBlankLines) {
                    // handle spaces after the last line
                    if (i === iz - 1) {
                        if (!stmt.body[i].trailingComments) {
                            generateBlankLines(stmt.body[i].range[1], stmt.range[1], result);
                        }
                    }
                }
            }
            return result;
        },

        FunctionDeclaration: function (stmt, flags) {
           
            encrypt_code('EnFunctionDeclaration', '', stmt)
            var temp = [
                generateAsyncPrefix(stmt, true),
                'function',
                generateStarSuffix(stmt) || noEmptySpace(),
                stmt.id ? generateIdentifier(stmt.id) : '',
                this.generateFunctionBody(stmt)
            ];
            encrypt_code('LvFunctionDeclaration', temp, stmt)
            return temp;
        },

        ReturnStatement: function (stmt, flags) {

            if (stmt.argument) {
                var retn_v = [join(
                    'return',
                    this.generateExpression(stmt.argument, Precedence.Sequence, E_TTT)
                ), this.semicolon(flags)]

                encrypt_code('ReturnStatement', '', stmt)
                return retn_v;
            }

            return ['return' + this.semicolon(flags)];
        },

        WhileStatement: function (stmt, flags) {
            var result, that = this;
            withIndent(function () {
                result = [
                    'while' + space + '(',
                    that.generateExpression(stmt.test, Precedence.Sequence, E_TTT),
                    ')'
                ];
            });
            result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
            return result;
        },

        WithStatement: function (stmt, flags) {
            var result, that = this;
            withIndent(function () {
                result = [
                    'with' + space + '(',
                    that.generateExpression(stmt.object, Precedence.Sequence, E_TTT),
                    ')'
                ];
            });
            result.push(this.maybeBlock(stmt.body, flags & F_SEMICOLON_OPT ? S_TFFT : S_TFFF));
            return result;
        }

    };

    merge(CodeGenerator.prototype, CodeGenerator.Statement);

    // Expressions.

    CodeGenerator.Expression = {

        SequenceExpression: function (expr, precedence, flags) {
            var result, i, iz;
            if (Precedence.Sequence < precedence) {
                flags |= F_ALLOW_IN;
            }
            result = [];
            for (i = 0, iz = expr.expressions.length; i < iz; ++i) {
                result.push(this.generateExpression(expr.expressions[i], Precedence.Assignment, flags));
                if (i + 1 < iz) {
                    result.push(',' + space);
                }
            }
            return parenthesize(result, Precedence.Sequence, precedence);
        },

        AssignmentExpression: function (expr, precedence, flags) {
            var result = this.generateAssignment(expr.left, expr.right, expr.operator, precedence, flags);
            // if(expr.right.type == 'CallExpression')
            //     encrypt_code('AssignmentExpression', 'CallExpression', expr)
            return result
        },

        ArrowFunctionExpression: function (expr, precedence, flags) {
            return parenthesize(this.generateFunctionBody(expr), Precedence.ArrowFunction, precedence);
        },

        ConditionalExpression: function (expr, precedence, flags) {
            if (Precedence.Conditional < precedence) {
                flags |= F_ALLOW_IN;
            }
            var a = parenthesize(
                [
                    this.generateExpression(expr.test, Precedence.LogicalOR, flags),
                    encrypt_code('ConditionalExpression_test', '', expr),
                    space + '?' + space,
                    this.generateExpression(expr.consequent, Precedence.Assignment, flags),
                    encrypt_code('ConditionalExpression_consequent', '', expr),
                    space + ':' + space,
                    this.generateExpression(expr.alternate, Precedence.Assignment, flags),
                    encrypt_code('ConditionalExpression_alternate', '', expr)
                ],
                Precedence.Conditional,
                precedence
            );
            
            return a
        },

        LogicalExpression: function (expr, precedence, flags) {
            var a = this.BinaryExpression(expr, precedence, flags);
            encrypt_code('LogicalExpression_', '', expr)
            return a

        },

        BinaryExpression: function (expr, precedence, flags) {
            var result, currentPrecedence, fragment, leftSource;
            currentPrecedence = BinaryPrecedence[expr.operator];

            if (currentPrecedence < precedence) {
                flags |= F_ALLOW_IN;
            }

            fragment = this.generateExpression(expr.left, currentPrecedence, flags);

            leftSource = fragment.toString();

            if (leftSource.charCodeAt(leftSource.length - 1) === 0x2F /* / */ && esutils.code.isIdentifierPartES5(expr.operator.charCodeAt(0))) {
                result = [fragment, noEmptySpace(), expr.operator];
            } else {
                result = join(fragment, expr.operator);
            }

            fragment = this.generateExpression(expr.right, currentPrecedence + 1, flags);

            if (expr.operator === '/' && fragment.toString().charAt(0) === '/' ||
            expr.operator.slice(-1) === '<' && fragment.toString().slice(0, 3) === '!--') {
                // If '/' concats with '/' or `<` concats with `!--`, it is interpreted as comment start
                result.push(noEmptySpace());
                result.push(fragment);
            } else {
                result = join(result, fragment);
            }

            if (expr.operator === 'in' && !(flags & F_ALLOW_IN)) {
                return ['(', result, ')'];
            }
            return parenthesize(result, currentPrecedence, precedence);
        },

        CallExpression: function (expr, precedence, flags) {
            var result, i, iz;
            // F_ALLOW_UNPARATH_NEW becomes false.
            result = [this.generateExpression(expr.callee, Precedence.Call, E_TTF)]; //函数名
            result.push('(');
            for (i = 0, iz = expr['arguments'].length; i < iz; ++i) {
                result.push(this.generateExpression(expr['arguments'][i], Precedence.Assignment, E_TTT));//参数
                if (i + 1 < iz) {
                    result.push(',' + space);
                }
            }
            result.push(')');

            encrypt_code('CallExpression', result, expr)//插桩

            if (!(flags & F_ALLOW_CALL)) {
                return ['(', result, ')'];
            }
            return parenthesize(result, Precedence.Call, precedence);
        },

        NewExpression: function (expr, precedence, flags) {
            var result, length, i, iz, itemFlags;
            length = expr['arguments'].length;

            // F_ALLOW_CALL becomes false.
            // F_ALLOW_UNPARATH_NEW may become false.
            itemFlags = (flags & F_ALLOW_UNPARATH_NEW && !parentheses && length === 0) ? E_TFT : E_TFF;

            result = join(
                'new',
                this.generateExpression(expr.callee, Precedence.New, itemFlags)
            );

            if (!(flags & F_ALLOW_UNPARATH_NEW) || parentheses || length > 0) {
                result.push('(');
                for (i = 0, iz = length; i < iz; ++i) {
                    result.push(this.generateExpression(expr['arguments'][i], Precedence.Assignment, E_TTT));
                    if (i + 1 < iz) {
                        result.push(',' + space);
                    }
                }
                result.push(')');
            }

            return parenthesize(result, Precedence.New, precedence);
        },

        MemberExpression: function (expr, precedence, flags) {
            var result, fragment;

            // F_ALLOW_UNPARATH_NEW becomes false.
            result = [this.generateExpression(expr.object, Precedence.Call, (flags & F_ALLOW_CALL) ? E_TTF : E_TFF)];

            if (expr.computed) {
                result.push('[');
                result.push(this.generateExpression(expr.property, Precedence.Sequence, flags & F_ALLOW_CALL ? E_TTT : E_TFT));
                result.push(']');
            } else {
                if (expr.object.type === Syntax.Literal && typeof expr.object.value === 'number') {
                    fragment = toSourceNodeWhenNeeded(result).toString();
                    // When the following conditions are all true,
                    //   1. No floating point
                    //   2. Don't have exponents
                    //   3. The last character is a decimal digit
                    //   4. Not hexadecimal OR octal number literal
                    // we should add a floating point.
                    if (
                            fragment.indexOf('.') < 0 &&
                            !/[eExX]/.test(fragment) &&
                            esutils.code.isDecimalDigit(fragment.charCodeAt(fragment.length - 1)) &&
                            !(fragment.length >= 2 && fragment.charCodeAt(0) === 48)  // '0'
                            ) {
                        result.push(' ');
                    }
                }
                result.push('.');
                result.push(generateIdentifier(expr.property));
            }

            return parenthesize(result, Precedence.Member, precedence);
        },

        MetaProperty: function (expr, precedence, flags) {
            var result;
            result = [];
            result.push(typeof expr.meta === "string" ? expr.meta : generateIdentifier(expr.meta));
            result.push('.');
            result.push(typeof expr.property === "string" ? expr.property : generateIdentifier(expr.property));
            return parenthesize(result, Precedence.Member, precedence);
        },

        UnaryExpression: function (expr, precedence, flags) {
            var result, fragment, rightCharCode, leftSource, leftCharCode;
            fragment = this.generateExpression(expr.argument, Precedence.Unary, E_TTT);

            if (space === '') {
                result = join(expr.operator, fragment);
            } else {
                result = [expr.operator];
                if (expr.operator.length > 2) {
                    // delete, void, typeof
                    // get `typeof []`, not `typeof[]`
                    result = join(result, fragment);
                } else {
                    // Prevent inserting spaces between operator and argument if it is unnecessary
                    // like, `!cond`
                    leftSource = toSourceNodeWhenNeeded(result).toString();
                    leftCharCode = leftSource.charCodeAt(leftSource.length - 1);
                    rightCharCode = fragment.toString().charCodeAt(0);

                    if (((leftCharCode === 0x2B  /* + */ || leftCharCode === 0x2D  /* - */) && leftCharCode === rightCharCode) ||
                            (esutils.code.isIdentifierPartES5(leftCharCode) && esutils.code.isIdentifierPartES5(rightCharCode))) {
                        result.push(noEmptySpace());
                        result.push(fragment);
                    } else {
                        result.push(fragment);
                    }
                }
            }
            return parenthesize(result, Precedence.Unary, precedence);
        },

        YieldExpression: function (expr, precedence, flags) {
            var result;
            if (expr.delegate) {
                result = 'yield*';
            } else {
                result = 'yield';
            }
            if (expr.argument) {
                result = join(
                    result,
                    this.generateExpression(expr.argument, Precedence.Yield, E_TTT)
                );
            }
            return parenthesize(result, Precedence.Yield, precedence);
        },

        AwaitExpression: function (expr, precedence, flags) {
            var result = join(
                expr.all ? 'await*' : 'await',
                this.generateExpression(expr.argument, Precedence.Await, E_TTT)
            );
            return parenthesize(result, Precedence.Await, precedence);
        },

        UpdateExpression: function (expr, precedence, flags) {
            if (expr.prefix) {
                return parenthesize(
                    [
                        expr.operator,
                        this.generateExpression(expr.argument, Precedence.Unary, E_TTT)
                    ],
                    Precedence.Unary,
                    precedence
                );
            }
            return parenthesize(
                [
                    this.generateExpression(expr.argument, Precedence.Postfix, E_TTT),
                    expr.operator
                ],
                Precedence.Postfix,
                precedence
            );
        },

        FunctionExpression: function (expr, precedence, flags) {
            var result = [
                generateAsyncPrefix(expr, true),
                'function'
            ];
            if (expr.id) {
                result.push(generateStarSuffix(expr) || noEmptySpace());
                result.push(generateIdentifier(expr.id));
            } else {
                result.push(generateStarSuffix(expr) || space);
            }
            result.push(this.generateFunctionBody(expr));
            return result;
        },

        ArrayPattern: function (expr, precedence, flags) {
            return this.ArrayExpression(expr, precedence, flags, true);
        },

        ArrayExpression: function (expr, precedence, flags, isPattern) {
            var result, multiline, that = this;
            if (!expr.elements.length) {
                return '[]';
            }
            multiline = isPattern ? false : expr.elements.length > 1;
            result = ['[', multiline ? newline : ''];
            withIndent(function (indent) {
                var i, iz;
                for (i = 0, iz = expr.elements.length; i < iz; ++i) {
                    if (!expr.elements[i]) {
                        if (multiline) {
                            result.push(indent);
                        }
                        if (i + 1 === iz) {
                            result.push(',');
                        }
                    } else {
                        result.push(multiline ? indent : '');
                        result.push(that.generateExpression(expr.elements[i], Precedence.Assignment, E_TTT));
                    }
                    if (i + 1 < iz) {
                        result.push(',' + (multiline ? newline : space));
                    }
                }
            });
            if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                result.push(newline);
            }
            result.push(multiline ? base : '');
            result.push(']');
            return result;
        },

        RestElement: function(expr, precedence, flags) {
            return '...' + this.generatePattern(expr.argument);
        },

        ClassExpression: function (expr, precedence, flags) {
            var result, fragment;
            result = ['class'];
            if (expr.id) {
                result = join(result, this.generateExpression(expr.id, Precedence.Sequence, E_TTT));
            }
            if (expr.superClass) {
                fragment = join('extends', this.generateExpression(expr.superClass, Precedence.Assignment, E_TTT));
                result = join(result, fragment);
            }
            result.push(space);
            result.push(this.generateStatement(expr.body, S_TFFT));
            return result;
        },

        MethodDefinition: function (expr, precedence, flags) {
            var result, fragment;
            if (expr['static']) {
                result = ['static' + space];
            } else {
                result = [];
            }
            if (expr.kind === 'get' || expr.kind === 'set') {
                fragment = [
                    join(expr.kind, this.generatePropertyKey(expr.key, expr.computed)),
                    this.generateFunctionBody(expr.value)
                ];
            } else {
                fragment = [
                    generateMethodPrefix(expr),
                    this.generatePropertyKey(expr.key, expr.computed),
                    this.generateFunctionBody(expr.value)
                ];
            }
            return join(result, fragment);
        },

        Property: function (expr, precedence, flags) {
            if (expr.kind === 'get' || expr.kind === 'set') {
                return [
                    expr.kind, noEmptySpace(),
                    this.generatePropertyKey(expr.key, expr.computed),
                    this.generateFunctionBody(expr.value)
                ];
            }

            if (expr.shorthand) {
                if (expr.value.type === "AssignmentPattern") {
                    return this.AssignmentPattern(expr.value, Precedence.Sequence, E_TTT);
                }
                return this.generatePropertyKey(expr.key, expr.computed);
            }

            if (expr.method) {
                return [
                    generateMethodPrefix(expr),
                    this.generatePropertyKey(expr.key, expr.computed),
                    this.generateFunctionBody(expr.value)
                ];
            }

            return [
                this.generatePropertyKey(expr.key, expr.computed),
                ':' + space,
                this.generateExpression(expr.value, Precedence.Assignment, E_TTT)
            ];
        },

        ObjectExpression: function (expr, precedence, flags) {
            var multiline, result, fragment, that = this;

            if (!expr.properties.length) {
                return '{}';
            }
            multiline = expr.properties.length > 1;

            withIndent(function () {
                fragment = that.generateExpression(expr.properties[0], Precedence.Sequence, E_TTT);
            });

            if (!multiline) {
                // issues 4
                // Do not transform from
                //   dejavu.Class.declare({
                //       method2: function () {}
                //   });
                // to
                //   dejavu.Class.declare({method2: function () {
                //       }});
                if (!hasLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                    return [ '{', space, fragment, space, '}' ];
                }
            }

            withIndent(function (indent) {
                var i, iz;
                result = [ '{', newline, indent, fragment ];

                if (multiline) {
                    result.push(',' + newline);
                    for (i = 1, iz = expr.properties.length; i < iz; ++i) {
                        result.push(indent);
                        result.push(that.generateExpression(expr.properties[i], Precedence.Sequence, E_TTT));
                        if (i + 1 < iz) {
                            result.push(',' + newline);
                        }
                    }
                }
            });

            if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                result.push(newline);
            }
            result.push(base);
            result.push('}');
            return result;
        },

        AssignmentPattern: function(expr, precedence, flags) {
            return this.generateAssignment(expr.left, expr.right, '=', precedence, flags);
        },

        ObjectPattern: function (expr, precedence, flags) {
            var result, i, iz, multiline, property, that = this;
            if (!expr.properties.length) {
                return '{}';
            }

            multiline = false;
            if (expr.properties.length === 1) {
                property = expr.properties[0];
                if (property.value.type !== Syntax.Identifier) {
                    multiline = true;
                }
            } else {
                for (i = 0, iz = expr.properties.length; i < iz; ++i) {
                    property = expr.properties[i];
                    if (!property.shorthand) {
                        multiline = true;
                        break;
                    }
                }
            }
            result = ['{', multiline ? newline : '' ];

            withIndent(function (indent) {
                var i, iz;
                for (i = 0, iz = expr.properties.length; i < iz; ++i) {
                    result.push(multiline ? indent : '');
                    result.push(that.generateExpression(expr.properties[i], Precedence.Sequence, E_TTT));
                    if (i + 1 < iz) {
                        result.push(',' + (multiline ? newline : space));
                    }
                }
            });

            if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                result.push(newline);
            }
            result.push(multiline ? base : '');
            result.push('}');
            return result;
        },

        ThisExpression: function (expr, precedence, flags) {
            return 'this';

        },

        Super: function (expr, precedence, flags) {
            return 'super';
        },

        Identifier: function (expr, precedence, flags) {
            return generateIdentifier(expr);
        },

        ImportDefaultSpecifier: function (expr, precedence, flags) {
            return generateIdentifier(expr.id || expr.local);
        },

        ImportNamespaceSpecifier: function (expr, precedence, flags) {
            var result = ['*'];
            var id = expr.id || expr.local;
            if (id) {
                result.push(space + 'as' + noEmptySpace() + generateIdentifier(id));
            }
            return result;
        },

        ImportSpecifier: function (expr, precedence, flags) {
            var imported = expr.imported;
            var result = [ imported.name ];
            var local = expr.local;
            if (local && local.name !== imported.name) {
                result.push(noEmptySpace() + 'as' + noEmptySpace() + generateIdentifier(local));
            }
            return result;
        },

        ExportSpecifier: function (expr, precedence, flags) {
            var local = expr.local;
            var result = [ local.name ];
            var exported = expr.exported;
            if (exported && exported.name !== local.name) {
                result.push(noEmptySpace() + 'as' + noEmptySpace() + generateIdentifier(exported));
            }
            return result;
        },

        Literal: function (expr, precedence, flags) {
            var raw;
            if (expr.hasOwnProperty('raw') && parse && extra.raw) {
                try {
                    raw = parse(expr.raw).body[0].expression;
                    if (raw.type === Syntax.Literal) {
                        if (raw.value === expr.value) {
                            return expr.raw;
                        }
                    }
                } catch (e) {
                    // not use raw property
                }
            }

            if (expr.value === null) {
                return 'null';
            }

            if (typeof expr.value === 'string') {
                return escapeString(expr.value);
            }

            if (typeof expr.value === 'number') {
                return generateNumber(expr.value);
            }

            if (typeof expr.value === 'boolean') {
                return expr.value ? 'true' : 'false';
            }

            if (expr.regex) {
              return '/' + expr.regex.pattern + '/' + expr.regex.flags;
            }
            return generateRegExp(expr.value);
        },

        GeneratorExpression: function (expr, precedence, flags) {
            return this.ComprehensionExpression(expr, precedence, flags);
        },

        ComprehensionExpression: function (expr, precedence, flags) {
            // GeneratorExpression should be parenthesized with (...), ComprehensionExpression with [...]
            // Due to https://bugzilla.mozilla.org/show_bug.cgi?id=883468 position of expr.body can differ in Spidermonkey and ES6

            var result, i, iz, fragment, that = this;
            result = (expr.type === Syntax.GeneratorExpression) ? ['('] : ['['];

            if (extra.moz.comprehensionExpressionStartsWithAssignment) {
                fragment = this.generateExpression(expr.body, Precedence.Assignment, E_TTT);
                result.push(fragment);
            }

            if (expr.blocks) {
                withIndent(function () {
                    for (i = 0, iz = expr.blocks.length; i < iz; ++i) {
                        fragment = that.generateExpression(expr.blocks[i], Precedence.Sequence, E_TTT);
                        if (i > 0 || extra.moz.comprehensionExpressionStartsWithAssignment) {
                            result = join(result, fragment);
                        } else {
                            result.push(fragment);
                        }
                    }
                });
            }

            if (expr.filter) {
                result = join(result, 'if' + space);
                fragment = this.generateExpression(expr.filter, Precedence.Sequence, E_TTT);
                result = join(result, [ '(', fragment, ')' ]);
            }

            if (!extra.moz.comprehensionExpressionStartsWithAssignment) {
                fragment = this.generateExpression(expr.body, Precedence.Assignment, E_TTT);

                result = join(result, fragment);
            }

            result.push((expr.type === Syntax.GeneratorExpression) ? ')' : ']');
            return result;
        },

        ComprehensionBlock: function (expr, precedence, flags) {
            var fragment;
            if (expr.left.type === Syntax.VariableDeclaration) {
                fragment = [
                    expr.left.kind, noEmptySpace(),
                    this.generateStatement(expr.left.declarations[0], S_FFFF)
                ];
            } else {
                fragment = this.generateExpression(expr.left, Precedence.Call, E_TTT);
            }

            fragment = join(fragment, expr.of ? 'of' : 'in');
            fragment = join(fragment, this.generateExpression(expr.right, Precedence.Sequence, E_TTT));

            return [ 'for' + space + '(', fragment, ')' ];
        },

        SpreadElement: function (expr, precedence, flags) {
            return [
                '...',
                this.generateExpression(expr.argument, Precedence.Assignment, E_TTT)
            ];
        },

        TaggedTemplateExpression: function (expr, precedence, flags) {
            var itemFlags = E_TTF;
            if (!(flags & F_ALLOW_CALL)) {
                itemFlags = E_TFF;
            }
            var result = [
                this.generateExpression(expr.tag, Precedence.Call, itemFlags),
                this.generateExpression(expr.quasi, Precedence.Primary, E_FFT)
            ];
            return parenthesize(result, Precedence.TaggedTemplate, precedence);
        },

        TemplateElement: function (expr, precedence, flags) {
            // Don't use "cooked". Since tagged template can use raw template
            // representation. So if we do so, it breaks the script semantics.
            return expr.value.raw;
        },

        TemplateLiteral: function (expr, precedence, flags) {
            var result, i, iz;
            result = [ '`' ];
            for (i = 0, iz = expr.quasis.length; i < iz; ++i) {
                result.push(this.generateExpression(expr.quasis[i], Precedence.Primary, E_TTT));
                if (i + 1 < iz) {
                    result.push('${' + space);
                    result.push(this.generateExpression(expr.expressions[i], Precedence.Sequence, E_TTT));
                    result.push(space + '}');
                }
            }
            result.push('`');
            return result;
        },

        ModuleSpecifier: function (expr, precedence, flags) {
            return this.Literal(expr, precedence, flags);
        }

    };

    merge(CodeGenerator.prototype, CodeGenerator.Expression);

    CodeGenerator.prototype.generateExpression = function (expr, precedence, flags) {
        var result, type;

        type = expr.type || Syntax.Property;

        if (extra.verbatim && expr.hasOwnProperty(extra.verbatim)) {
            return generateVerbatim(expr, precedence);
        }

        result = this[type](expr, precedence, flags);


        if (extra.comment) {
            result = addComments(expr, result);
        }
        return toSourceNodeWhenNeeded(result, expr);
    };

    CodeGenerator.prototype.generateStatement = function (stmt, flags) {
        var result,
            fragment;

        result = this[stmt.type](stmt, flags);

        // Attach comments

        if (extra.comment) {
            result = addComments(stmt, result);
        }

        fragment = toSourceNodeWhenNeeded(result).toString();
        if (stmt.type === Syntax.Program && !safeConcatenation && newline === '' &&  fragment.charAt(fragment.length - 1) === '\n') {
            result = sourceMap ? toSourceNodeWhenNeeded(result).replaceRight(/\s+$/, '') : fragment.replace(/\s+$/, '');
        }

        return toSourceNodeWhenNeeded(result, stmt);
    };

    function generateInternal(node) {
        var codegen;

        codegen = new CodeGenerator();
        if (isStatement(node)) {
            return codegen.generateStatement(node, S_TFFF);
        }

        if (isExpression(node)) {
            return codegen.generateExpression(node, Precedence.Sequence, E_TTT);
        }

        throw new Error('Unknown node type: ' + node.type);
    }

    function generate(node, options) {
        var defaultOptions = getDefaultOptions(), result, pair;

        if (options != null) {
            // Obsolete options
            //
            //   `options.indent`
            //   `options.base`
            //
            // Instead of them, we can use `option.format.indent`.
            if (typeof options.indent === 'string') {
                defaultOptions.format.indent.style = options.indent;
            }
            if (typeof options.base === 'number') {
                defaultOptions.format.indent.base = options.base;
            }
            options = updateDeeply(defaultOptions, options);
            indent = options.format.indent.style;
            if (typeof options.base === 'string') {
                base = options.base;
            } else {
                base = stringRepeat(indent, options.format.indent.base);
            }
        } else {
            options = defaultOptions;
            indent = options.format.indent.style;
            base = stringRepeat(indent, options.format.indent.base);
        }
        json = options.format.json;
        renumber = options.format.renumber;
        hexadecimal = json ? false : options.format.hexadecimal;
        quotes = json ? 'double' : options.format.quotes;
        escapeless = options.format.escapeless;
        newline = options.format.newline;
        space = options.format.space;
        if (options.format.compact) {
            newline = space = indent = base = '';
        }
        parentheses = options.format.parentheses;
        semicolons = options.format.semicolons;
        safeConcatenation = options.format.safeConcatenation;
        directive = options.directive;
        parse = json ? null : options.parse;
        sourceMap = options.sourceMap;
        sourceCode = options.sourceCode;
        preserveBlankLines = options.format.preserveBlankLines && sourceCode !== null;
        extra = options;

        if (sourceMap) {
            if (!exports.browser) {
                // We assume environment is node.js
                // And prevent from including source-map by browserify
                SourceNode = require('source-map').SourceNode;
            } else {
                SourceNode = global.sourceMap.SourceNode;
            }
        }

        result = generateInternal(node);

        if (!sourceMap) {
            pair = {code: result.toString(), map: null};
            return options.sourceMapWithCode ? pair : pair.code;
        }


        pair = result.toStringWithSourceMap({
            file: options.file,
            sourceRoot: options.sourceMapRoot
        });

        if (options.sourceContent) {
            pair.map.setSourceContent(options.sourceMap,
                                      options.sourceContent);
        }

        if (options.sourceMapWithCode) {
            return pair;
        }

        return pair.map.toString();
    }

    FORMAT_MINIFY = {
        indent: {
            style: '',
            base: 0
        },
        renumber: true,
        hexadecimal: true,
        quotes: 'auto',
        escapeless: true,
        compact: true,
        parentheses: false,
        semicolons: false
    };

    FORMAT_DEFAULTS = getDefaultOptions().format;

    exports.version = require('./package.json').version;
    exports.generate = generate;
    exports.attachComments = estraverse.attachComments;
    exports.Precedence = updateDeeply({}, Precedence);
    exports.browser = false;
    exports.FORMAT_MINIFY = FORMAT_MINIFY;
    exports.FORMAT_DEFAULTS = FORMAT_DEFAULTS;
}());
/* vim: set sw=4 ts=4 et tw=80 : */
