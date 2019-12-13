# Cosos Creator 2.2.X shader 教程  
## 前言
自己之前要做shader的一些效果，发现cocos相关文档很少，后面在论坛看帖子慢慢摸索了几周，也踩了几个坑耽误了一些功夫  
现在把自己总结的一些笔记和大家分享讨论一下，有什么错误或者不足的欢迎提建议，自己也还是个刚入门的，希望可以帮到一些想着手的童鞋，也算是回馈社区
## 几个简单的效果

[查看demo代码](https://github.com/XuDaFei/CocosCreator-2.2.X-shader-demo)

![shader使用流程](/readme_pic/shader.png)  
## 新建 shader 资源
### 编辑器中:  
在 Creator 中新建所需的 matrial、effect, 并且在 material 中设置对应的 effct 资源

### 代码中:
你需要在creator.d.ts 中添加几个接口来防止 ts 报错(不加只是爆红，不影响使用)  
```typescript
export class Material extends Asset {	
	effectAsset: Asset;		//材质对应的effect资源
	define(name: string, val: any): void;		//设置宏定义
	setProperty(name:string, val: any);			//设置变量
	static getBuiltinMaterial(materialUrl: string): Material	//获取系统的材质
	{
	}
}
export class EffectAsset extends Asset
{
}
```
设置材质的接口
```typescript
/** !#en
Base class for components which supports rendering features.
!#zh
所有支持渲染的组件的基类 */
export class RenderComponent extends Component
{
	/** !#en The materials used by this render component.
	!#zh 渲染组件使用的材质。 */
	sharedMaterials: Material[];
	/**
	!#en Get the material by index.
	!#zh 根据指定索引获取材质
	@param index index 
	*/
	getMaterial(index: number): Material;
	/**
	!#en Set the material by index.
	!#zh 根据指定索引设置材质
	@param index index
	@param material material 
	*/
	setMaterial(index: number,material: Material): void;
}
```
你可以用上面的几个接口来加载对应 effect 和 material，设置属性，设置对应的材质到对应的组件上  
只要是继承了 RenderComponent 的组件，比如是Sprite, Label, Spine等，都可以设置和获取材质  

## Effect 资源和 Matrial 资源
EffectAsset 就是保存我们自己编写的 shader 程序, 在引擎中对应着 EffectAsset 资源, 引擎读取渲染组件中的 effect 配置，并设置  
对应渲染数据后调用WebGL的API进行渲染。
Creator 2.2 版本已经更新了 effect 文件的格式，关于 Matrial 和 Effect 的可以参考 [Cocos Creator 3D文档](https://docs.cocos.com/creator3d/manual/zh/material-system/overview.html)  
这里用一个最简单的栗子来介绍一下
```yaml
CCEffect %{
  techniques:
  - passes:
    - vert: vs		//指向vert shader
      frag: fs		//指向frag shader
      blendState:	//渲染参数
        targets:
        - blend: true
      rasterizerState:
        cullMode: none
      properties:	//变量，会显示在 material 面板 上
        texture: { value: white }
        u_time: { value: 1.0 }
}%

CCProgram vs %{		//顶点着色器（GLSL 300 es格式）
	#include <cc-global>	//引用头文件，cc_matViewProj 变换矩阵就是在里面的变量
	precision highp float;	//定义精度
    in vec3 a_position;		//顶点位置
    in vec2 a_uv0;			//uv 坐标
    out vec2 uv0;			//插值输出到片元的uv 坐标
    void main () {
        gl_Position = cc_matViewProj * vec4(a_position, 1);
        uv0 = a_uv0;
    }
}%

CCProgram fs %{		//片元着色器
	precision highp float;		//定义精度
	uniform sampler2D texture;	//纹理
	uniform ARGS {				//除了系统的uniform ,其他uniform 变量都要定义在UBO(统一变量块)内
		//时间 根据时间计算需要丢弃的像素颜色值范围，也就是溶解的范围
		float u_time;
	}
	in vec2 uv0;

	void main()
	{
		float time = u_time;
		vec4 c = texture2D(texture,uv0);	//用纹理和uv坐标采样到对应片元的颜色
		float height = c.g;
		if(height < time)
		{
			//丢弃像素，相当于溶解效果
			discard;
		}
		if(height < time + 0.1) {
			//这里可以对溶解边缘进行一些处理，比如透明度减少等
			c.a = c.a-0.1;
		}
		//给片元（像素）赋值
		gl_FragColor = c;
	}
}%
```
Material 只需要在编辑器或者代码中设置对应的effect。在初始化和运行的时候设置对应的变量  

## 运行
像溶解和流光等效果都需要在运行的代码中更新对应的时间参数，下面也举个小栗子  
```typescript
const {ccclass,property} = cc._decorator;

@ccclass
export default class ShaderTime extends cc.Component
{
    /**记录时间 */
    private time: number;
    /**精灵上的材质 */
    private material: any;
    private IsAdd: boolean;

    /**时间参数 */
    @property(cc.Float)
    speed: number = 1.0;

    start()
    {
        this.time = 0;
        this.IsAdd = true;
        this.material = this.node.getComponent(cc.Sprite).getMaterial(0);   //获取材质 
    }

    update(dt)
    {
        this.material.setProperty("u_time",this.time);          //设置材质对应的属性
        this.IsAdd ? this.time += dt * this.speed : this.time -= dt * this.speed;
        if(this.time > 1.5)
        {
            this.IsAdd = false;
        }
        else if(this.time < -0.5)
        {
            this.IsAdd = true;
        }
    }
}
```
## 关于合图导致web和模拟器显示不一致的BUG
![合图错误](/readme_pic/hetucuowu.png)  
原因: Cocos 会把小于512*512的碎图自动合图以减少DrawCall，而effect中接收到的uv 坐标是整个合图的uv,  导致需要用到uv坐标的effect在自动合图下显示不正确。
解决办法：
- 关闭自动合图
ps: 在Cocos Creator 2.1.3和2.2.0 以上都支持单独取消某个纹理的合图  
- 手动获取当前sprite 的纹理uv坐标传入到effect(无需取消自动合图)  
```typescript
//获取UV位置到Effect
let frame = sprite.spriteFrame as any;
let l = 0,r = 0,b = 1,t = 1;
l = frame.uv[0];
t = frame.uv[5];
r = frame.uv[6];
b = frame.uv[3];
let u_UVoffset = new cc.Vec4(l,t,r,b);
let u_rotated = frame.isRotated() ? 1.0 : 0.0;
this._material.setProperty("u_UVoffset",u_UVoffset);
this._material.setProperty("u_rotated",u_rotated);
//在Effect 中接受u_UVoffset u_rotated 后重新设置UV
vec2 UVnormalize;
UVnormalize.x = (uv0.x-u_UVoffset.x)/(u_UVoffset.z-u_UVoffset.x);
UVnormalize.y = (uv0.y-u_UVoffset.y)/(u_UVoffset.w-u_UVoffset.y);
if(u_rotated > 0.5)
{
	float temp = UVnormalize.x;
	UVnormalize.x = UVnormalize.y;
	UVnormalize.y = 1.0 - temp;
}
```

## 总结
有了材质和Effect以后，cocos使用shader 更加直观了。  
移植一个需要shader 效果其实也只是在effect文件中设置好变量，修改一下shader 的代码片段语法，最后在代码或面板中设置参数即可  
当然里面可能会有一些不兼容的属性或者一些细节的问题

## 学习Shader 
- [OpenGL 教程](https://learnopengl-cn.github.io/intro/) 手把手教学,我自己之前也是看这个，良心教程！  
- [WebGL 教程](https://webglfundamentals.org/webgl/lessons/zh_cn/) 
- [GLSL语法](https://thebookofshaders.com/02/?lan=ch) 
