const {ccclass,property} = cc._decorator;

@ccclass
export default class ShaderTime extends cc.Component
{
    /**记录时间 */
    private time: number;
    private sprite: cc.Sprite;
    /**精灵上的材质 */
    private material: any;
    /**增加还是减少 */
    private IsAdd: boolean;

    /**速度 */
    @property({type: cc.Float,tooltip: "速度"})
    speed = 1.0;

    /**是否循环 */
    @property({tooltip: "是否循环"})
    isLoop: boolean = false;

    /**是否设置UV到effect(解决动态合图的bug) */
    @property({tooltip: "是否设置UV到effect(解决动态合图的bug)"})
    isSetUv: boolean = false;

    start()
    {
        this.time = 0;
        this.IsAdd = true;
        this.sprite = this.node.getComponent(cc.Sprite);
        this.material = this.sprite.getMaterial(0);   //获取材质 
    }

    update(dt)
    {
        this.material.setProperty("u_time",this.time);          //设置材质对应的属性
        (this.isLoop && !this.IsAdd) ? this.time -= dt * this.speed : this.time += dt * this.speed;
        if(this.isSetUv)
        {   //传递UV 参数到 effect
            let frame = this.sprite.spriteFrame as any;
            let l = 0,r = 0,b = 1,t = 1;
            l = frame.uv[0];
            t = frame.uv[5];
            r = frame.uv[6];
            b = frame.uv[3];
            let u_UVoffset = new cc.Vec4(l,t,r,b);
            let u_rotated = frame.isRotated() ? 1.0 : 0.0;
            this.material.setProperty("u_UVoffset",u_UVoffset);
            this.material.setProperty("u_rotated",u_rotated);
        }
        cc.log(this.time);
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
